import { describe, expect, it } from "vitest";
import { adjustFixturePlanForConversation, conversationForPlan, limitRevisionSessions, preserveLoggedSessions } from "@/lib/coach/plan-revision";
import type { TrainingPlan, WorkoutLog } from "@/lib/types";

const current: TrainingPlan = {
  id: "old-plan",
  weekStartIso: "2026-11-09T08:00:00.000Z",
  generatedFromGoal: "Move more",
  sessions: [
    { id: "done", dayIndex: 0, title: "Walk", rationale: "Start easy", intensity: "easy", steps: [] },
    { id: "future", dayIndex: 3, title: "Long walk", rationale: "Build time", intensity: "moderate", steps: [] },
  ],
};

const proposed: TrainingPlan = {
  ...current,
  id: "new-plan",
  sessions: [
    { id: "replacement", dayIndex: 0, title: "Run", rationale: "Too late", intensity: "hard", steps: [{ name: "Run", detail: "30 minutes", durationMin: 30 }] },
    { id: "short", dayIndex: 3, title: "Short walk", rationale: "Fits today", intensity: "easy", steps: [{ name: "Walk", detail: "20 minutes", durationMin: 20 }] },
  ],
};

describe("plan revision", () => {
  it("keeps the last meaningful conversation turns, including the user's constraints", () => {
    const turns = conversationForPlan([
      { role: "user", content: "Old detail" },
      { role: "assistant", content: "  " },
      { role: "user", content: "I only have 10 minutes on Thursday." },
    ], 2);
    expect(turns).toEqual([
      { role: "user", content: "Old detail" },
      { role: "user", content: "I only have 10 minutes on Thursday." },
    ]);
  });

  it("keeps logged sessions and replaces only unlogged days", () => {
    const logs: WorkoutLog[] = [{
      id: "log-1", sessionId: "done", status: "completed", completedAt: "2026-11-09T17:00:00.000Z",
    }];
    const result = preserveLoggedSessions(proposed, current, logs);
    expect(result.sessions.map((session) => session.id)).toEqual(["done", "short"]);
  });

  it("does not carry a logged session into a different week", () => {
    const nextWeek = { ...proposed, weekStartIso: "2026-11-16T08:00:00.000Z" };
    const logs: WorkoutLog[] = [{
      id: "log-1", sessionId: "done", status: "completed", completedAt: "2026-11-09T17:00:00.000Z",
    }];
    expect(preserveLoggedSessions(nextWeek, current, logs)).toEqual(nextWeek);
  });

  it("shortens an offline draft to the time the user said they have", () => {
    const result = adjustFixturePlanForConversation(proposed, [
      { role: "user", content: "I can only do 10 minutes this week." },
    ]);
    expect(result.sessions.every((session) =>
      session.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0) <= 10,
    )).toBe(true);
    expect(result.sessions.find((session) => session.id === "short")?.steps[0].durationMin).toBe(10);
    expect(result.sessions.every((session) => session.intensity === "easy")).toBe(true);
  });

  it("keeps a day the user mentioned when a draft has too many sessions", () => {
    const crowded = {
      ...current,
      sessions: Array.from({ length: 7 }, (_, dayIndex) => ({
        id: `day-${dayIndex}`, dayIndex, title: `Day ${dayIndex}`,
        rationale: "Move", intensity: "easy" as const, steps: [],
      })),
    };
    const limited = limitRevisionSessions(crowded, [
      { role: "user", content: "Saturday is the day I can train." },
    ], [
      { id: "log", sessionId: "day-0", status: "completed", completedAt: "2026-11-09T17:00:00.000Z" },
    ]);
    expect(limited.sessions.map((session) => session.dayIndex)).toEqual([0, 1, 2, 5]);
  });
});
