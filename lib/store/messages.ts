import type { ComposedMessage } from "@/lib/types";
import { readRecords, writeRecord } from "./storage";

export async function listMessages(): Promise<ComposedMessage[]> {
  const msgs = await readRecords("messages");
  return msgs.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function addMessage(m: ComposedMessage): Promise<void> {
  await writeRecord("messages", m.id, m);
}
