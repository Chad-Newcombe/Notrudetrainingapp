import { createId } from "@/lib/ids";
import type { PlanSchemaOutput } from "@/lib/ai/schemas";
import type { PlanSession, TrainingPlan, UserProfile } from "@/lib/types";

function weekStartIso(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

export function normalizePlanFromSchema(
  output: PlanSchemaOutput,
  profile: UserProfile,
): TrainingPlan {
  const sessions: PlanSession[] = output.sessions.map((session) => ({
    id: createId(),
    dayIndex: session.dayIndex,
    title: session.title,
    rationale: session.rationale,
    steps: session.steps,
    intensity: session.intensity,
  }));

  return {
    id: createId(),
    weekStartIso: weekStartIso(),
    sessions,
    generatedFromGoal: profile.goalText,
  };
}
