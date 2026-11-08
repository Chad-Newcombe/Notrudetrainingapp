import type { ChatMessage } from "@/lib/types";
import { getDb } from "./db";

export async function listChat(): Promise<ChatMessage[]> {
  const db = await getDb();
  const msgs = await db.getAll("chat");
  return msgs.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function appendChat(m: ChatMessage): Promise<void> {
  const db = await getDb();
  await db.put("chat", m);
}

export async function replaceChat(msgs: ChatMessage[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("chat", "readwrite");
  await tx.store.clear();
  for (const m of msgs) {
    await tx.store.put(m);
  }
  await tx.done;
}
