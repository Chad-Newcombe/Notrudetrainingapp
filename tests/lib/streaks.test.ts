import { describe, it, expect } from "vitest";
import { computeStreak } from "@/lib/progress/streaks";
import type { WorkoutLog } from "@/lib/types";

describe("computeStreak", () => {
  it("returns 0 for empty logs", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("returns 2 for two consecutive qualifying days ending today", () => {
    const today = new Date();
    today.setHours(14, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const logs: WorkoutLog[] = [
      {
        id: "a",
        sessionId: "s1",
        status: "completed",
        completedAt: today.toISOString(),
      },
      {
        id: "b",
        sessionId: "s2",
        status: "partial",
        completedAt: yesterday.toISOString(),
      },
    ];

    expect(computeStreak(logs)).toBe(2);
  });

  it("returns 1 when only yesterday has a qualifying log", () => {
    const now = new Date();
    now.setHours(10, 0, 0, 0);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const logs: WorkoutLog[] = [
      {
        id: "a",
        sessionId: "s1",
        status: "completed",
        completedAt: yesterday.toISOString(),
      },
    ];

    expect(computeStreak(logs, now)).toBe(1);
  });

  it("returns 0 when last qualifying log is two or more days ago", () => {
    const now = new Date();
    now.setHours(10, 0, 0, 0);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const logs: WorkoutLog[] = [
      {
        id: "a",
        sessionId: "s1",
        status: "completed",
        completedAt: twoDaysAgo.toISOString(),
      },
    ];

    expect(computeStreak(logs, now)).toBe(0);
  });
});

describe("computeStreak with plans", () => {
  // Week of Mon 9 Nov 2026: sessions Mon, Wed, Fri.
  const week = (start: string, ids: string[]) => ({
    id: start, weekStartIso: new Date(start + "T00:00:00").toISOString(), generatedFromGoal: "g",
    sessions: [0, 2, 4].map((dayIndex, i) => ({ id: ids[i], dayIndex, title: "S", rationale: "r", intensity: "easy" as const, steps: [] })),
  });
  const done = (sessionId: string, status: WorkoutLog["status"] = "completed"): WorkoutLog => ({ id: sessionId + status, sessionId, status, completedAt: "2026-11-01T00:00:00.000Z" });
  const plans = [week("2026-11-02", ["a1", "a2", "a3"]), week("2026-11-09", ["b1", "b2", "b3"])];

  it("skips rest days and counts across weeks", () => {
    const now = new Date("2026-11-12T18:00:00"); // Thursday, a rest day
    expect(computeStreak([done("a2"), done("a3"), done("b1"), done("b2", "partial")], now, plans)).toBe(4);
  });

  it("leaves today's session open and breaks on a skipped or missed one", () => {
    const wed = new Date("2026-11-11T09:00:00");
    expect(computeStreak([done("a3"), done("b1")], wed, plans)).toBe(2);
    expect(computeStreak([done("a3"), done("b1", "skipped")], wed, plans)).toBe(0);
    expect(computeStreak([done("b1")], new Date("2026-11-13T09:00:00"), plans)).toBe(0); // Wednesday missed
  });
});
