import type { ChatMessage } from "@/lib/types";
import { readRecords, writeRecord, saveConversation } from "./storage";

export async function listChat(): Promise<ChatMessage[]> {
  const msgs = await readRecords("chat");
  return msgs.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function appendChat(m: ChatMessage): Promise<void> {
  await writeRecord("chat", m.id, m);
}

export async function replaceChat(msgs: ChatMessage[]): Promise<void> {
  await saveConversation(msgs);
}
