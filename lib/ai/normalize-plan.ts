import { weekStartIso } from "@/lib/dates";
import { createId } from "@/lib/ids";
import type { PlanSchemaOutput } from "@/lib/ai/schemas";
import type { PlanSession, TrainingPlan, UserProfile } from "@/lib/types";

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
