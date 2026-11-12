import type { PlanSession, TrainingPlan } from "@/lib/types";

export type SessionMetric = { label: string; value: string };

export function sessionDurationMin(session: PlanSession): number | null {
  if (session.steps.length === 0) return null;
  if (session.steps.some((step) => step.durationMin == null)) return null;
  return session.steps.reduce((total, step) => total + (step.durationMin ?? 0), 0);
}

export function weeklyDurationMin(plan: TrainingPlan): number | null {
  if (plan.sessions.length === 0) return null;
  const durations = plan.sessions.map(sessionDurationMin);
  if (durations.some((duration) => duration == null)) return null;
  return durations.reduce<number>((total, duration) => total + (duration ?? 0), 0);
}

export function sessionMetrics(session: PlanSession): SessionMetric[] {
  const duration = sessionDurationMin(session);
  return [
    ...(duration == null ? [] : [{ label: "Duration", value: `${duration} min` }]),
    { label: "Intensity", value: `${session.intensity[0].toUpperCase()}${session.intensity.slice(1)}` },
    { label: "Steps", value: String(session.steps.length) },
  ];
}
