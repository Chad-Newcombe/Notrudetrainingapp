import type { WorkoutLog } from "@/lib/types";

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

/** Consecutive days with completed or partial logs ending today or yesterday. */
export function computeStreak(logs: WorkoutLog[], now = new Date()): number {
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
