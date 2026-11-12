import type { CoachId, UserProfile } from "@/lib/types";

export function profileWithCoach(profile: UserProfile, coachId: CoachId): UserProfile {
  return profile.coachId === coachId ? profile : { ...profile, coachId };
}
