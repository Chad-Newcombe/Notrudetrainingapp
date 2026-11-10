import type { Collection, StoredRecord } from "@/lib/account/records";
import type { ChatMessage } from "@/lib/types";
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
  if (accountId) {
    await accountRequest("", { action: "put", record: { collection, key, value } });
    return;
  }
  const db = await getDb();
  await db.put(collection, value, collection === "meta" ? key : undefined);
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
  const tx = db.transaction(["meta", "logs", "chat", "progress", "health", "messages"], "readonly");
  const [profile, plan, logs, chat, progress, health, messages] = await Promise.all([
    tx.objectStore("meta").get("profile"), tx.objectStore("meta").get("plan"),
    tx.objectStore("logs").getAll(), tx.objectStore("chat").getAll(),
    tx.objectStore("progress").getAll(), tx.objectStore("health").getAll(),
    tx.objectStore("messages").getAll(),
  ]);
  await tx.done;
  const records: StoredRecord[] = [
    ...logs.map((value): StoredRecord => ({ collection: "logs", key: value.id, value })),
    ...chat.map((value): StoredRecord => ({ collection: "chat", key: value.id, value })),
    ...progress.map((value): StoredRecord => ({ collection: "progress", key: value.id, value })),
    ...health.map((value): StoredRecord => ({ collection: "health", key: value.provider, value })),
    ...messages.map((value): StoredRecord => ({ collection: "messages", key: value.id, value })),
  ];
  if (profile) records.push({ collection: "meta", key: "profile", value: profile });
  if (plan) records.push({ collection: "meta", key: "plan", value: plan });
  return records;
}

export async function importGuestData(records: StoredRecord[]) {
  if (!accountId) throw new Error("Sign in before importing device data.");
  await accountRequest("", { action: "import", records });
}
