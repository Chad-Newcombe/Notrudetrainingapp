import type { Insight, InsightKind } from "@/lib/coach/insight";
import { dayIndexInPlanWeek, weekStartIso } from "@/lib/dates";
import { getCoachNotes, getCoachRelationship, saveCoachNote } from "@/lib/store";
import type { CoachNote, TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

export type InsightInput = { profile: UserProfile; plan: TrainingPlan | null; history: TrainingPlan[]; logs: WorkoutLog[] };

export function todayIndex(now = new Date()): number {
  return dayIndexInPlanWeek(weekStartIso(now), now) ?? 0;
}

export async function requestInsight(kind: InsightKind, input: InsightInput, logId?: string): Promise<Insight> {
  const coachId = input.profile.coachId ?? "river";
  const response = await fetch("/api/coach/insight", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind, logId, today: todayIndex(),
      profile: input.profile, plan: input.plan, history: input.history.slice(-4), logs: input.logs.slice(-40),
      relationship: await getCoachRelationship(coachId),
    }),
  });
  if (!response.ok) throw new Error("Coach unavailable");
  return (await response.json()) as Insight;
}

/** The day's or week's note from the leading coach, cached until the period, coach, plan or check-ins change. */
export async function coachNote(kind: "daily" | "weekly", input: InsightInput, now = new Date()): Promise<CoachNote> {
  const coachId = input.profile.coachId ?? "river";
  const period = kind === "daily" ? now.toDateString() : weekStartIso(now).slice(0, 10);
  // The log count is in the key so a newly logged or skipped session gets a fresh note, not last week's take.
  const key = `${period}|${coachId}|${input.plan?.id ?? "none"}|${input.logs.length}`;
  const cached = (await getCoachNotes())[kind];
  if (cached?.key === key) return cached;
  const { message } = await requestInsight(kind, input);
  const note: CoachNote = { key, coachId, text: message, createdAt: now.toISOString() };
  await saveCoachNote(kind, note);
  return note;
}
