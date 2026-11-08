export function weekStartIso(d = new Date()): string {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() + diff);
  return x.toISOString();
}

/** Mon=0 … Sun=6, relative to the plan week that starts at `planWeekStartIso`. */
export function dayIndexInPlanWeek(
  planWeekStartIso: string,
  d = new Date(),
): number {
  const start = new Date(planWeekStartIso);
  start.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (day.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  return Math.max(0, Math.min(6, diffDays));
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
