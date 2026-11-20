import type { CoachNotes } from "@/lib/types";
import { readRecord, writeRecord } from "./storage";

const KEY = "coach-notes";

export async function getCoachNotes(): Promise<CoachNotes> {
  return ((await readRecord("meta", KEY)) as CoachNotes | undefined) ?? {};
}

export async function saveCoachNote(kind: keyof CoachNotes, note: NonNullable<CoachNotes[keyof CoachNotes]>): Promise<void> {
  await writeRecord("meta", KEY, { ...(await getCoachNotes()), [kind]: note });
}
