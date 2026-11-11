import { describe, expect, it } from "vitest";
import {
  adjustFixturePlanForConversation,
  classifyPlanIntent,
  conversationForPlan,
  createPlanTransition,
  describePlanChanges,
  enforceLatestTimeConstraint,
  limitRevisionSessions,
  persistPlanTransition,
  preserveLoggedSessions,
  undoPlanTransition,
} from "@/lib/coach/plan-revision";
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
  it.each([
    "Make Thursday ten minutes.",
    "Move Friday's workout to Saturday.",
    "Replace running with walking this week.",
    "Add a rest day to my plan.",
    "I can only do 15 minutes on Tuesday.",
    "Make this week's sessions easier.",
    "I can't train Friday.",
    "I need Tuesday to be shorter.",
    "No running this week.",
    "I want three sessions.",
    "Make workouts ten minutes.",
  ])("recognizes an explicit plan instruction: %s", (text) => {
    expect(classifyPlanIntent(text)).toBe("explicit");
  });

  it.each([
    "This week feels hard.",
    "Can we talk about my plan?",
    "I might need a change.",
    "Change my password.",
    "What do you think about Thursday?",
  ])("keeps discussion from mutating the plan: %s", (text) => {
    expect(classifyPlanIntent(text)).toBe("discussion");
  });

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

  it("puts a generated time change on the day the user named", () => {
    const offByOne: TrainingPlan = {
      ...proposed,
      sessions: [
        proposed.sessions[0],
        {
          ...proposed.sessions[1],
          dayIndex: 4,
          title: "10-minute easy walk",
          steps: [{ name: "Walk", detail: "Easy", durationMin: 10 }],
        },
      ],
    };

    const corrected = enforceLatestTimeConstraint(offByOne, current, [
      { role: "user", content: "Make Thursday ten minutes." },
    ]);

    expect(corrected.sessions.find((session) => session.dayIndex === 3)?.steps[0].durationMin).toBe(10);
    expect(corrected.sessions.some((session) => session.dayIndex === 4)).toBe(false);
    expect(corrected.sessions.find((session) => session.dayIndex === 0)).toEqual(current.sessions[0]);
  });

  it("leaves compound instructions to the full plan revision instead of dropping parts", () => {
    const compound = enforceLatestTimeConstraint(proposed, current, [
      { role: "user", content: "Move Friday to Saturday and make Thursday 10 minutes." },
    ]);
    const activityChange = enforceLatestTimeConstraint(proposed, current, [
      { role: "user", content: "Make Thursday a 10-minute walk instead of strength." },
    ]);

    expect(compound).toBe(proposed);
    expect(activityChange).toBe(proposed);
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

  it("describes the literal day-level changes in a revised plan", () => {
    const next: TrainingPlan = {
      ...proposed,
      sessions: [
        { ...proposed.sessions[1], title: "Easy walk", intensity: "easy" },
        { id: "saturday", dayIndex: 5, title: "Mobility", rationale: "Recover", intensity: "easy", steps: [] },
      ],
    };

    expect(describePlanChanges(current, next)).toEqual([
      "Removed Walk from Monday.",
      "Changed Thursday from Long walk to Easy walk.",
      "Added Mobility on Saturday.",
    ]);
  });

  it("describes a duration-only change without pretending the workout title changed", () => {
    const next: TrainingPlan = {
      ...current,
      sessions: current.sessions.map((session) => session.dayIndex === 3
        ? { ...session, steps: [{ name: "Walk", detail: "Easy", durationMin: 10 }] }
        : session),
    };
    expect(describePlanChanges(current, next)).toEqual(["Changed Thursday to 10 minutes."]);
  });

  it("keeps the previous plan available for an exact undo", () => {
    const transition = createPlanTransition(current, proposed);
    expect(transition.previous).toBe(current);
    expect(transition.current).toBe(proposed);
    expect(undoPlanTransition(transition)).toBe(current);
  });

  it("does not report a transition when saving the new plan fails", async () => {
    const save = async () => { throw new Error("storage failed"); };
    await expect(persistPlanTransition(current, proposed, save)).rejects.toThrow("storage failed");
  });
});
