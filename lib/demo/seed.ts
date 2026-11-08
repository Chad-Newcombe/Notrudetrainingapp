import { fixturePlanForProfile } from "@/lib/ai/fixtures";
import { savePlan, saveProfile } from "@/lib/store";
import type { TrainingPlan, UserProfile } from "@/lib/types";

export type DemoProfileId = "ultra" | "gentle-start";

const now = () => new Date().toISOString();

export function demoProfileFor(id: DemoProfileId): UserProfile {
  const base = {
    tone: "steady" as const,
    cadence: "conversational" as const,
    motivation: "process_focus" as const,
    channels: ["in_app", "email_outline"] as UserProfile["channels"],
    trackWeight: false,
    createdAt: now(),
  };

  if (id === "ultra") {
    return {
      ...base,
      goalText: "Complete a 50-mile ultra this fall without burning out",
      activityLevel: "moderate",
      constraints: "Long work weeks; need recoverable mileage",
    };
  }

  return {
    ...base,
    goalText: "Start moving again and lose weight at a sustainable pace",
    currentWeightLbs: 315,
    targetWeightLbs: 260,
    activityLevel: "sedentary",
    constraints: "Knee-friendly options; no shame about pace",
    trackWeight: true,
    tone: "gentle",
    cadence: "brief",
    motivation: "celebrate_wins",
    channels: ["in_app", "text_style", "email_outline"],
  };
}

/** Saves a demo profile and fixture week plan (skips quiz + acknowledgment). */
export async function seedDemoProfile(
  id: DemoProfileId,
): Promise<{ profile: UserProfile; plan: TrainingPlan }> {
  const profile = demoProfileFor(id);
  const plan = fixturePlanForProfile(profile);
  await saveProfile(profile);
  await savePlan(plan);
  return { profile, plan };
}
