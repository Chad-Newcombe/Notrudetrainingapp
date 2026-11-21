import { z } from "zod";
import { canWriteRecord, coachConversationSchema, COACH_MIGRATION_KEY, collectionSchema, parseRecord, recordSchema, validRecordKey } from "@/lib/account/records";
import { getAccountServices } from "@/lib/account/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const operation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("put"), record: recordSchema }),
  z.object({ action: z.literal("putMany"), records: z.array(recordSchema).min(1).max(5000) }),
  z.object({ action: z.literal("migrateLegacyChat"), records: z.array(recordSchema).min(1).max(2) }),
  z.object({ action: z.literal("delete"), collection: collectionSchema, key: z.string().min(1).max(200) }),
  z.object({ action: z.literal("mergeChat"), records: z.array(recordSchema).max(3000) }),
  z.object({ action: z.literal("import"), records: z.array(recordSchema).min(1).max(5000) }),
]);

function respond(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function authorize(request: Request) {
  const services = await getAccountServices();
  if (!services) return null;
  const session = await services.auth.api.getSession({ headers: request.headers });
  if (!session || request.headers.get("x-notrude-account") !== session.user.id) return null;
  return { ...services, userId: session.user.id };
}

export async function GET(request: Request) {
  const access = await authorize(request);
  if (!access) return respond({ error: "Sign in to load account data." }, 401);
  const query = new URL(request.url).searchParams;
  const collection = collectionSchema.safeParse(query.get("collection"));
  if (!collection.success) return respond({ error: "Invalid collection." }, 400);
  const key = query.get("key");
  if (key !== null && !validRecordKey(collection.data, key)) return respond({ error: "Invalid record key." }, 400);
  const { db, userId } = access;
  const { rows } = key === null
    ? await db.query("SELECT payload FROM coaching_record WHERE user_id = $1 AND collection = $2 ORDER BY record_key", [userId, collection.data])
    : await db.query("SELECT payload FROM coaching_record WHERE user_id = $1 AND collection = $2 AND record_key = $3", [userId, collection.data, key]);
  return respond({ values: rows.map((row) => JSON.parse(String(row.payload))) });
}

export async function POST(request: Request) {
  const access = await authorize(request);
  if (!access) return respond({ error: "Sign in to save account data." }, 401);
  if (request.headers.get("origin") !== access.origin ||
      !request.headers.get("content-type")?.startsWith("application/json")) {
    return respond({ error: "Invalid request origin." }, 403);
  }

  const body = await request.text();
  if (Buffer.byteLength(body) > 2_000_000) return respond({ error: "Too much data in one request." }, 413);
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return respond({ error: "Invalid JSON." }, 400);
  }

  const parsed = operation.safeParse(json);
  if (!parsed.success) return respond({ error: "Invalid data operation." }, 400);
  const { action } = parsed.data;
  const { db, userId } = access;
  if (parsed.data.action === "delete") {
    const { collection, key } = parsed.data;
    if (!validRecordKey(collection, key)) return respond({ error: "Invalid record key." }, 400);
    await db.query("DELETE FROM coaching_record WHERE user_id = $1 AND collection = $2 AND record_key = $3", [userId, collection, key]);
    return respond({ ok: true });
  }
  const records = (action === "put" ? [parsed.data.record] : parsed.data.records).map(parseRecord);
  if (records.some((record) => !record || (action === "mergeChat" && record.collection !== "chat"))) {
    return respond({ error: "A record could not be saved." }, 400);
  }
  if (action === "migrateLegacyChat") {
    const marker = records.at(-1);
    const archive = records.length === 2 ? records[0] : null;
    const conversation = archive ? coachConversationSchema.safeParse(archive.value) : null;
    if (marker?.collection !== "meta" || marker.key !== COACH_MIGRATION_KEY || marker.value !== true ||
        (archive && (archive.collection !== "coachConversations" || archive.key !== "legacy-chat-v2" ||
          !conversation?.success || conversation.data.status !== "archived"))) {
      return respond({ error: "Invalid legacy migration." }, 400);
    }
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // One writer per account at a time, as SQLite's BEGIN IMMEDIATE gave us.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
    if (action === "migrateLegacyChat" && (await client.query(
      "SELECT 1 FROM coaching_record WHERE user_id = $1 AND collection = 'meta' AND record_key = $2", [userId, COACH_MIGRATION_KEY],
    )).rows.length) {
      await client.query("COMMIT");
      return respond({ ok: true, migrated: false });
    }
    if (action === "import" && (await client.query("SELECT 1 FROM coaching_record WHERE user_id = $1 LIMIT 1", [userId])).rows.length) {
      await client.query("ROLLBACK");
      return respond({ error: "This account already has data. Your local data was left on this device." }, 409);
    }
    for (const record of records) {
      if (!record) continue;
      const current = record.collection === "coachConversations" ? (await client.query(
        "SELECT payload FROM coaching_record WHERE user_id = $1 AND collection = $2 AND record_key = $3", [userId, record.collection, record.key],
      )).rows[0] : undefined;
      if (!canWriteRecord(current ? JSON.parse(String(current.payload)) : undefined, record)) {
        await client.query("ROLLBACK");
        return respond({ error: "Conversation is immutable or belongs to another coach." }, 409);
      }
      await client.query(`
        INSERT INTO coaching_record (user_id, collection, record_key, payload)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, collection, record_key) DO UPDATE SET payload = excluded.payload
      `, [userId, record.collection, record.key, JSON.stringify(record.value)]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return respond({ ok: true, ...(action === "migrateLegacyChat" ? { migrated: true } : {}) });
}
