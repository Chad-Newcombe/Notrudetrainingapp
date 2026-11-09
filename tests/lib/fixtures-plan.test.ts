import { describe, it, expect } from "vitest";
import { fixturePlanForProfile } from "@/lib/ai/fixtures";

const base = {
  tone: "gentle" as const,
  cadence: "brief" as const,
  motivation: "celebrate_wins" as const,
  channels: ["in_app" as const],
  coachId: "river" as const,
  trackWeight: false,
  createdAt: "2026-11-08T00:00:00.000Z",
};

describe("fixturePlanForProfile", () => {
  it("builds an endurance-leaning week for ultra goals", () => {
    const plan = fixturePlanForProfile({ ...base, goalText: "Finish a 50k ultra" });
    expect(plan.sessions.length).toBeGreaterThanOrEqual(3);
    expect(plan.sessions.some((s) => /run|hike|endurance|walk/i.test(s.title + s.rationale))).toBe(true);
  });

  it("builds a gentle week for high-weight start language", () => {
    const plan = fixturePlanForProfile({
      ...base,
      goalText: "Just trying to lose weight and feel better",
      trackWeight: true,
      currentWeightLbs: 400,
    });
    expect(plan.sessions.every((s) => s.intensity !== "hard")).toBe(true);
  });

  it("builds a mixed consistency week for habit goals without weight focus", () => {
    const plan = fixturePlanForProfile({
      ...base,
      goalText: "Start a push-up habit",
    });
    const titles = plan.sessions.map((s) => s.title).join(" ");
    expect(/Mobility and breathing|Easy walk/i.test(titles)).toBe(false);
    expect(plan.sessions.some((s) => /walk|circuit|recovery/i.test(s.title))).toBe(
      true,
    );
  });
});
