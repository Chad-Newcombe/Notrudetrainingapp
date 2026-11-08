import type { ComposedMessage } from "@/lib/types";
import { getDb } from "./db";

export async function listMessages(): Promise<ComposedMessage[]> {
  const db = await getDb();
  const msgs = await db.getAll("messages");
  return msgs.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function addMessage(m: ComposedMessage): Promise<void> {
  const db = await getDb();
  await db.put("messages", m);
}
