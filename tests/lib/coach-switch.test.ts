import { describe, expect, it } from "vitest";
import { profileWithCoach } from "@/lib/coaches/switch";
import type { UserProfile } from "@/lib/types";

const profile: UserProfile = {
  goalText: "Walk consistently",
  intakeBrief: {
    trainingApproach: "Keep sessions short",
    supportApproach: "Ask before offering another option",
    progressSignal: "Three walks each week",
  },
  constraints: "Ten minutes on weekdays",
  tone: "gentle",
  cadence: "brief",
  motivation: "process_focus",
  channels: ["in_app"],
  trackWeight: false,
  coachId: "river",
  createdAt: "2026-11-10T12:00:00.000Z",
};

describe("switching coaches", () => {
  it("changes only the coach selection", () => {
    const switched = profileWithCoach(profile, "sol");
    expect(switched).toEqual({ ...profile, coachId: "sol" });
    expect(switched.intakeBrief).toBe(profile.intakeBrief);
  });

  it("keeps the same profile object when the coach is unchanged", () => {
    expect(profileWithCoach(profile, "river")).toBe(profile);
  });
});
