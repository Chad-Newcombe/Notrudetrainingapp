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
    "I want Tuesday off from work.",
    "Change Tuesday's dinner.",
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
    const namedActivity = enforceLatestTimeConstraint(proposed, current, [
      { role: "user", content: "Make Thursday a 10-minute run." },
    ]);
    const namedIntensity = enforceLatestTimeConstraint(proposed, current, [
      { role: "user", content: "Make Thursday 10 minutes hard." },
    ]);
    const recovery = enforceLatestTimeConstraint(proposed, current, [
      { role: "user", content: "Make Thursday a 10-minute recovery session." },
    ]);
    const yoga = enforceLatestTimeConstraint(proposed, current, [
      { role: "user", content: "Make Thursday 10 minutes of yoga." },
    ]);
    const namedExistingActivity = enforceLatestTimeConstraint(proposed, current, [
      { role: "user", content: "Make Thursday's walk 10 minutes." },
    ]);

    expect(compound).toBe(proposed);
    expect(activityChange).toBe(proposed);
    expect(namedActivity).toBe(proposed);
    expect(namedIntensity).toBe(proposed);
    expect(recovery).toBe(proposed);
    expect(yoga).toBe(proposed);
    expect(namedExistingActivity).toBe(proposed);
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

describe("asking a coach for a harder or easier week", () => {
  const session = (intensity: "easy" | "moderate" | "hard", durationMin: number) => ({ id: intensity, dayIndex: 0, title: "Walk", rationale: "Base", intensity, steps: [{ name: "Walk", detail: "Steady", durationMin }] });
  const week = { id: "p", weekStartIso: "2026-11-09", generatedFromGoal: "Walk", sessions: [session("easy", 20), session("hard", 40)] };
  it("treats the request as an explicit plan change", () => {
    expect(classifyPlanIntent("I want a harder plan")).toBe("explicit");
    expect(classifyPlanIntent("Make my plan easier")).toBe("explicit");
  });
  it("steps intensity and duration up or down in demo mode", () => {
    const harder = adjustFixturePlanForConversation(week, [{ role: "user", content: "I want a harder plan" }]);
    expect(harder.sessions.map((item) => [item.intensity, item.steps[0].durationMin])).toEqual([["moderate", 25], ["hard", 50]]);
    const easier = adjustFixturePlanForConversation(week, [{ role: "user", content: "Make my plan easier" }]);
    expect(easier.sessions.map((item) => [item.intensity, item.steps[0].durationMin])).toEqual([["easy", 15], ["moderate", 30]]);
    expect(adjustFixturePlanForConversation(week, [{ role: "user", content: "How was my week" }])).toBe(week);
  });
});

it("removes AI formatting from coach replies only", async () => {
  const { cleanCoachText, uiMessageText } = await import("@/lib/coach/messages");
  expect(cleanCoachText('Your couch has **excellent** lawyers — but they lose.  \n\n*"Five minutes"* is enough.'))
    .toBe('Your couch has excellent lawyers, but they lose.\n"Five minutes" is enough.');
  expect(cleanCoachText("# Plan\n- Walk 10–15 minutes")).toBe("Plan\nWalk 10-15 minutes");
  const part = [{ type: "text" as const, text: "I *really* mean it — move it" }];
  expect(uiMessageText({ id: "u", role: "user", parts: part })).toBe("I *really* mean it — move it");
  expect(uiMessageText({ id: "a", role: "assistant", parts: part })).toBe("I really mean it, move it");
});

import { applyPlanEdits, parsePlanEdits, summarizePlanEdits } from "@/lib/coach/plan-edit";

describe("plan edits", () => {
  const week: TrainingPlan = {
    id: "w", weekStartIso: "2026-11-09T08:00:00.000Z", generatedFromGoal: "Move more",
    sessions: [
      { id: "a", dayIndex: 1, title: "Easy run", rationale: "r", intensity: "easy", steps: [{ name: "Run", detail: "d", durationMin: 30 }] },
      { id: "b", dayIndex: 3, title: "Long walk", rationale: "r", intensity: "moderate", steps: [{ name: "Walk", detail: "d", durationMin: 40 }] },
    ],
  };
  const at = (plan: TrainingPlan | null, dayIndex: number) => plan?.sessions.find((s) => s.dayIndex === dayIndex);

  it("adds on a free day and leaves every other session untouched", () => {
    const next = applyPlanEdits(week, [{ op: "add", newActivity: "yoga", toDay: "thursday" }], [], "", 0);
    expect(at(next, 4)?.title).toBe("Yoga"); // Thursday is taken, so the nearest free day
    expect(next?.sessions.filter((s) => s.id === "a" || s.id === "b")).toEqual(week.sessions);
    expect(at(applyPlanEdits(week, [{ op: "add", newActivity: "yoga" }], [], "", 1), 2)?.title).toBe("Yoga");
  });

  it("removes, moves, swaps, replaces, resizes, and scales by day or activity", () => {
    expect(applyPlanEdits(week, [{ op: "remove", activity: "running" }], [], "", 0)?.sessions.map((s) => s.id)).toEqual(["b"]);
    expect(at(applyPlanEdits(week, [{ op: "move", day: "tuesday", toDay: "friday" }], [], "", 0), 4)?.id).toBe("a");
    const swapped = applyPlanEdits(week, [{ op: "move", day: "tuesday", toDay: "thursday" }], [], "", 0);
    expect([at(swapped, 3)?.id, at(swapped, 1)?.id]).toEqual(["a", "b"]);
    const ride = at(applyPlanEdits(week, [{ op: "replace", activity: "run", newActivity: "bike ride" }], [], "", 0), 1);
    expect([ride?.title, ride?.steps[0].durationMin, ride?.steps[0].name]).toEqual(["Bike ride", 30, "Bike ride"]);
    expect(at(applyPlanEdits(week, [{ op: "set", day: "thursday", minutes: 20 }], [], "", 0), 3)?.steps[0].durationMin).toBe(20);
    expect(applyPlanEdits(week, [{ op: "harder" }], [], "", 0)?.sessions.map((s) => s.intensity)).toEqual(["moderate", "hard"]);
  });

  it("gives an added session the coach's exercises, splitting its minutes between them", () => {
    const exercises = [{ name: "Goblet squat", detail: "3 x 8-10" }, { name: "Romanian deadlift", detail: "3 x 8" }, { name: "Dumbbell row", detail: "3 x 10" }];
    const lift = at(applyPlanEdits(week, [{ op: "add", newActivity: "strength", minutes: 45, exercises }], [], "", 1), 2);
    expect(lift?.steps).toEqual(exercises.map((e) => ({ ...e, durationMin: 15 })));
  });

  it("ignores a day the user never said and finds the session named in the message", () => {
    const moved = applyPlanEdits(week, [{ op: "move", day: "tuesday", toDay: "friday" }], [], "move my walk to Friday", 0);
    expect([at(moved, 4)?.id, at(moved, 1)?.id]).toEqual(["b", "a"]);
    expect(at(applyPlanEdits(week, [{ op: "add", day: "thursday", newActivity: "yoga" }], [], "add a yoga day", 1), 2)?.title).toBe("Yoga");
  });

  it("returns null when an edit cannot be applied exactly, and never edits a logged session", () => {
    expect(applyPlanEdits(week, [{ op: "rewrite" }], [], "", 0)).toBeNull();
    expect(applyPlanEdits(week, [{ op: "remove", activity: "swimming" }], [], "", 0)).toBeNull();
    expect(applyPlanEdits(null, [{ op: "harder" }], [], "", 0)).toBeNull();
    const logs = [{ id: "l", sessionId: "a", status: "completed", completedAt: "x" }] as WorkoutLog[];
    expect(applyPlanEdits(week, [{ op: "remove", day: "tuesday" }], logs, "", 0)).toBeNull();
    expect(applyPlanEdits(week, [{ op: "easier" }], logs, "", 0)?.sessions[0]).toEqual(week.sessions[0]);
  });

  it("reads common phrasings without a model and leaves chat alone", () => {
    const run = (text: string) => applyPlanEdits(week, parsePlanEdits(text), [], text, 0);
    expect(at(run("add a yoga day to my week"), 2)?.title).toBe("Yoga");
    expect(at(run("Move Tuesday to Friday."), 4)?.id).toBe("a");
    expect(at(run("move my walk to Friday"), 4)?.id).toBe("b");
    expect(at(run("swap my run for a bike ride"), 1)?.title).toBe("Bike ride");
    expect(at(run("I'd rather do a swim instead of the long walk"), 3)?.title).toBe("Swim");
    expect(run("drop the long walk")?.sessions.map((s) => s.id)).toEqual(["a"]);
    expect(at(run("make Thursday 20 minutes"), 3)?.steps[0].durationMin).toBe(20);
    expect(run("this plan is too easy, step it up")?.sessions.map((s) => s.intensity)).toEqual(["moderate", "hard"]);
    for (const chat of ["I skipped Tuesday", "it was harder than I thought", "what should I eat", "I should add that I'm tired", "be funnier"]) {
      expect(parsePlanEdits(chat)).toEqual([]);
    }
  });

  it("explains a taken day and sums up a whole-week change in one line", () => {
    const notes: string[] = [];
    const edits = [{ op: "add" as const, newActivity: "yoga", toDay: "thursday" as const }];
    const next = applyPlanEdits(week, edits, [], "add yoga on Thursday", 0, notes)!;
    expect(summarizePlanEdits(week, next, edits, notes)).toEqual(["Added Yoga on Friday.", "Thursday already has Long walk, so Yoga went on Friday."]);
    const moved = applyPlanEdits(week, [{ op: "move", day: "tuesday", toDay: "thursday" }], [], "", 0)!;
    expect(summarizePlanEdits(week, moved, [])).toEqual(["Moved Long walk from Thursday to Tuesday.", "Moved Easy run from Tuesday to Thursday."]);
    expect(summarizePlanEdits(week, week, [{ op: "harder" }])).toEqual(["Every remaining session this week is now a step harder."]);
  });
});
