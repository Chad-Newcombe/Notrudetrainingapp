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
