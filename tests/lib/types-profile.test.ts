import { describe, it, expect } from "vitest";
import type { UserProfile } from "@/lib/types";

describe("UserProfile shape", () => {
  it("allows open-ended goal without weight", () => {
    const profile: UserProfile = {
      goalText: "Train for my first ultra",
      tone: "steady",
      cadence: "conversational",
      motivation: "process_focus",
      channels: ["in_app", "email_outline"],
      trackWeight: false,
      createdAt: "2026-11-08T00:00:00.000Z",
    };
    expect(profile.trackWeight).toBe(false);
    expect(profile.currentWeightLbs).toBeUndefined();
  });
});
