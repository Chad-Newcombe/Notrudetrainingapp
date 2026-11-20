import { dayIndexInPlanWeek } from "@/lib/dates";
import type { TrainingPlan, WorkoutLog } from "@/lib/types";

function dayKey(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function offsetDayKey(base: Date, deltaDays: number): string {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + deltaDays);
  return dayKey(d.toISOString());
}

/**
 * Planned sessions done in a row. Rest days never break the streak; only a planned session
 * that was skipped or missed does. Today's session still counts as open until the day ends.
 * Without plans, falls back to consecutive days with a completed or partial log.
 */
export function computeStreak(logs: WorkoutLog[], now = new Date(), plans: TrainingPlan[] = []): number {
  if (plans.length > 0) return plannedStreak(logs, now, plans);
  const qualifying = new Set<string>();
  for (const log of logs) {
    if (log.status === "completed" || log.status === "partial") {
      qualifying.add(dayKey(log.completedAt));
    }
  }
  if (qualifying.size === 0) return 0;

  const todayKey = dayKey(now.toISOString());
  const yesterdayKey = offsetDayKey(now, -1);

  if (!qualifying.has(todayKey) && !qualifying.has(yesterdayKey)) return 0;

  let streak = 0;
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);

  if (!qualifying.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (qualifying.has(dayKey(cursor.toISOString()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function plannedStreak(logs: WorkoutLog[], now: Date, plans: TrainingPlan[]): number {
  const done = new Set(logs.filter((log) => log.status !== "skipped").map((log) => log.sessionId));
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  let streak = 0;
  for (let back = 0; back < 400; back += 1, cursor.setDate(cursor.getDate() - 1)) {
    const week = plans.find((plan) => dayIndexInPlanWeek(plan.weekStartIso, cursor) !== null);
    if (!week) break; // no plan covers this day, so history ends here
    const dayIndex = dayIndexInPlanWeek(week.weekStartIso, cursor);
    const planned = week.sessions.filter((session) => session.dayIndex === dayIndex);
    if (planned.length === 0) continue; // rest day
    if (planned.every((session) => done.has(session.id))) streak += 1;
    else if (back === 0) continue; // today is still open
    else break;
  }
  return streak;
}
