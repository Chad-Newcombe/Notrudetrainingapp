import type { TrainingPlan, UserProfile } from "@/lib/types";

/** Where to send users who must finish onboarding before using the main app. */
export function onboardingRedirect(
  profile: UserProfile | null,
  plan: TrainingPlan | null,
): "/" | "/acknowledgment" | null {
  if (!profile) return "/";
  if (!plan) return "/acknowledgment";
  return null;
}
