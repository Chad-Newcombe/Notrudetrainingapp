import { canWriteRecord, COACH_MIGRATION_KEY, parseRecord, type Collection, type StoredRecord } from "@/lib/account/records";
import type { ChatMessage, CoachConversation } from "@/lib/types";
import { getDb, type NotrudeSchema } from "./db";

let accountId: string | null = null;

export function setStorageAccount(userId: string | null) {
  accountId = userId;
}

async function accountRequest<T>(path = "", body?: unknown): Promise<T> {
  try {
    const response = await fetch(`/api/account/data${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", "x-notrude-account": accountId ?? "" },
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Account storage is unavailable.");
    return result as T;
  } catch (error) {
    window.dispatchEvent(new CustomEvent("notrude-account-error", {
      detail: error instanceof Error ? error.message : "Account storage is unavailable.",
    }));
    throw error;
  }
}

type Value<C extends Collection> = NotrudeSchema[C]["value"];

export async function readRecord<C extends Collection>(collection: C, key: NotrudeSchema[C]["key"]): Promise<Value<C> | undefined> {
  if (accountId) {
    const query = new URLSearchParams({ collection, key });
    return (await accountRequest<{ values: Value<C>[] }>(`?${query}`)).values[0];
  }
  return (await getDb()).get(collection, key);
}

export async function readRecords<C extends Collection>(collection: C): Promise<Value<C>[]> {
  if (accountId) {
    const query = new URLSearchParams({ collection });
    return (await accountRequest<{ values: Value<C>[] }>(`?${query}`)).values;
  }
  return (await getDb()).getAll(collection);
}

export async function writeRecord<C extends Collection>(
  collection: C, key: NotrudeSchema[C]["key"], value: Value<C>,
) {
  if (collection === "coachConversations") {
    await writeRecords([{ collection, key, value }]);
    return;
  }
  if (accountId) {
    await accountRequest("", { action: "put", record: { collection, key, value } });
    return;
  }
  const db = await getDb();
  await db.put(collection, value, collection === "meta" ? key : undefined);
}

export async function deleteRecord<C extends Collection>(collection: C, key: NotrudeSchema[C]["key"]): Promise<void> {
  if (accountId) {
    await accountRequest("", { action: "delete", collection, key });
    return;
  }
  await (await getDb()).delete(collection, key);
}

export async function writeRecords(records: StoredRecord[]): Promise<void> {
  await putRecords(records);
}

export async function commitLegacyChatMigration(conversation?: CoachConversation): Promise<boolean> {
  return putRecords([
    ...(conversation ? [{ collection: "coachConversations" as const, key: conversation.id, value: conversation }] : []),
    { collection: "meta", key: COACH_MIGRATION_KEY, value: true },
  ], true);
}

async function putRecords(records: StoredRecord[], migration = false): Promise<boolean> {
  const parsed = records.map(parseRecord);
  if (parsed.some((record) => !record)) throw new Error("A record could not be saved.");
  if (parsed.length === 0) return false;
  if (accountId) {
    const result = await accountRequest<{ migrated?: boolean }>("", {
      action: migration ? "migrateLegacyChat" : "putMany", records: parsed,
    });
    return migration ? result.migrated === true : true;
  }
  const db = await getDb();
  const tx = db.transaction([...new Set(records.map(({ collection }) => collection))], "readwrite");
  try {
    if (migration && await tx.objectStore("meta").get(COACH_MIGRATION_KEY)) {
      await tx.done;
      return false;
    }
    for (const record of parsed) {
      if (!record) continue;
      const store = tx.objectStore(record.collection);
      const current = record.collection === "coachConversations" ? await store.get(record.key) : undefined;
      if (!canWriteRecord(current, record)) throw new Error("Conversation is immutable or belongs to another coach.");
      await store.put(record.value as NotrudeSchema[Collection]["value"], record.collection === "meta" ? record.key : undefined);
    }
    await tx.done;
    return true;
  } catch (error) {
    // A failed IndexedDB request may already have aborted its transaction.
    try { tx.abort(); } catch { /* Already completed or aborted. */ }
    await tx.done.catch(() => {});
    throw error;
  }
}

export async function saveConversation(messages: ChatMessage[]) {
  if (accountId) {
    const records = messages.slice(-30).map((value) => ({ collection: "chat", key: value.id, value }));
    await accountRequest("", { action: "mergeChat", records });
    return;
  }
  const db = await getDb();
  const tx = db.transaction("chat", "readwrite");
  await tx.store.clear();
  for (const message of messages) await tx.store.put(message);
  await tx.done;
}

export async function guestRecords(): Promise<StoredRecord[]> {
  const db = await getDb();
  const tx = db.transaction(["meta", "logs", "chat", "progress", "health", "messages", "coachConversations", "coachRelationships"], "readonly");
  const [profile, plan, marker, logs, chat, progress, health, messages, conversations, relationships] = await Promise.all([
    tx.objectStore("meta").get("profile"), tx.objectStore("meta").get("plan"),
    tx.objectStore("meta").get("coach-conversation-migration-v2"),
    tx.objectStore("logs").getAll(), tx.objectStore("chat").getAll(),
    tx.objectStore("progress").getAll(), tx.objectStore("health").getAll(),
    tx.objectStore("messages").getAll(),
    tx.objectStore("coachConversations").getAll(), tx.objectStore("coachRelationships").getAll(),
  ]);
  await tx.done;
  const records: StoredRecord[] = [
    ...logs.map((value): StoredRecord => ({ collection: "logs", key: value.id, value })),
    ...chat.map((value): StoredRecord => ({ collection: "chat", key: value.id, value })),
    ...progress.map((value): StoredRecord => ({ collection: "progress", key: value.id, value })),
    ...health.map((value): StoredRecord => ({ collection: "health", key: value.provider, value })),
    ...messages.map((value): StoredRecord => ({ collection: "messages", key: value.id, value })),
    ...conversations.map((value): StoredRecord => ({ collection: "coachConversations", key: value.id, value })),
    ...relationships.map((value): StoredRecord => ({ collection: "coachRelationships", key: value.coachId, value })),
  ];
  if (profile) records.push({ collection: "meta", key: "profile", value: profile });
  if (plan) records.push({ collection: "meta", key: "plan", value: plan });
  if (marker) records.push({ collection: "meta", key: "coach-conversation-migration-v2", value: marker });
  return records;
}

export async function importGuestData(records: StoredRecord[]) {
  if (!accountId) throw new Error("Sign in before importing device data.");
  await accountRequest("", { action: "import", records });
}
