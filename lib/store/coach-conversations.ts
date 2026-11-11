import { coachConversationSchema } from "@/lib/account/records";
import { conversationsForCoach } from "@/lib/coach/conversations";
import type { CoachConversation, CoachId } from "@/lib/types";
import { deleteRecord, readRecord, readRecords, writeRecord } from "./storage";

export async function listCoachConversations(coachId?: CoachId): Promise<CoachConversation[]> {
  const records = await readRecords("coachConversations");
  return coachId === undefined
    ? records.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    : conversationsForCoach(records, coachId);
}

export async function getCoachConversation(id: string): Promise<CoachConversation | undefined> {
  return readRecord("coachConversations", id);
}

export async function saveCoachConversation(value: CoachConversation): Promise<void> {
  const parsed = coachConversationSchema.parse(value);
  await writeRecord("coachConversations", parsed.id, parsed);
}

export async function deleteCoachConversation(id: string): Promise<void> {
  await deleteRecord("coachConversations", id);
}
