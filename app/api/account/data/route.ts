import { z } from "zod";
import { collectionSchema, parseRecord, recordSchema } from "@/lib/account/records";
import { getAccountServices } from "@/lib/account/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const operation = z.discriminatedUnion("action", [
  z.object({ action: z.literal("put"), record: recordSchema }),
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
  const { db, userId } = access;
  const values = key === null
    ? db.prepare("SELECT payload FROM coaching_record WHERE user_id = ? AND collection = ? ORDER BY record_key").all(userId, collection.data)
    : db.prepare("SELECT payload FROM coaching_record WHERE user_id = ? AND collection = ? AND record_key = ?").all(userId, collection.data, key);
  return respond({ values: values.map((row) => JSON.parse(String(row.payload))) });
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
  const records = (action === "put" ? [parsed.data.record] : parsed.data.records).map(parseRecord);
  if (records.some((record) => !record || (action === "mergeChat" && record.collection !== "chat"))) {
    return respond({ error: "A record could not be saved." }, 400);
  }

  const { db, userId } = access;
  db.exec("BEGIN IMMEDIATE");
  try {
    if (action === "import" && db.prepare("SELECT 1 FROM coaching_record WHERE user_id = ? LIMIT 1").get(userId)) {
      db.exec("ROLLBACK");
      return respond({ error: "This account already has data. Your local data was left on this device." }, 409);
    }
    const upsert = db.prepare(`
      INSERT INTO coaching_record (user_id, collection, record_key, payload)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, collection, record_key) DO UPDATE SET payload = excluded.payload
    `);
    for (const record of records) {
      if (record) upsert.run(userId, record.collection, record.key, JSON.stringify(record.value));
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return respond({ ok: true });
}
