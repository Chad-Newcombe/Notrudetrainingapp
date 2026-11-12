import { coachRelationshipSchema } from "@/lib/account/records";
import type { CoachId, CoachRelationship } from "@/lib/types";
import { readRecord, writeRecord } from "./storage";

export function emptyCoachRelationship(coachId: CoachId, now = new Date().toISOString()): CoachRelationship {
  return { coachId, learnedPreferences: [], rejectedPatterns: [], declinedSwitchSuggestion: false, updatedAt: now };
}

export async function getCoachRelationship(coachId: CoachId): Promise<CoachRelationship> {
  const result = coachRelationshipSchema.safeParse(await readRecord("coachRelationships", coachId));
  return result.success && result.data.coachId === coachId ? result.data : emptyCoachRelationship(coachId);
}

export async function saveCoachRelationship(value: CoachRelationship): Promise<void> {
  const parsed = coachRelationshipSchema.parse(value);
  await writeRecord("coachRelationships", parsed.coachId, parsed);
}
