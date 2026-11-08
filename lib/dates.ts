export function weekStartIso(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + diff);
  return x.toISOString();
}

/** Local calendar day as UTC ms (for stable day deltas in the runtime timezone). */
function localCalendarDayMs(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Mon=0 … Sun=6 within the plan week starting at `planWeekStartIso` (local Monday).
 * Returns null when `d` falls outside that Mon–Sun window (do not clamp).
 */
export function dayIndexInPlanWeek(
  planWeekStartIso: string,
  d = new Date(),
): number | null {
  const start = new Date(planWeekStartIso);
  const diffDays = Math.round(
    (localCalendarDayMs(d) - localCalendarDayMs(start)) /
      (24 * 60 * 60 * 1000),
  );
  if (diffDays < 0 || diffDays > 6) return null;
  return diffDays;
}

export const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
