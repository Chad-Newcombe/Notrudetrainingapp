import { describe, it, expect } from "vitest";
import { fixtureComposedMessage } from "@/lib/ai/fixtures";

describe("fixtureComposedMessage", () => {
  it("builds email outline with subject", () => {
    const m = fixtureComposedMessage("email_outline", {
      goalText: "ultra",
      tone: "steady",
      cadence: "conversational",
      motivation: "accountability",
      channels: ["email_outline"],
      coachId: "nova",
      trackWeight: false,
      createdAt: "2026-11-08T00:00:00.000Z",
    });
    expect(m.subject).toBeTruthy();
    expect(m.body.length).toBeGreaterThan(20);
    expect(m.direction).toBe("coach_to_user");
    expect(m.fromCoachId).toBe("nova");
  });
});
