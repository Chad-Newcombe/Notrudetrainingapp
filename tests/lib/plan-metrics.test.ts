import { describe, expect, it } from "vitest";
import {
  sessionDurationMin,
  sessionMetrics,
  weeklyDurationMin,
} from "@/lib/plan/metrics";
import type { PlanSession, TrainingPlan } from "@/lib/types";

const session = (overrides: Partial<PlanSession> = {}): PlanSession => ({
  id: "session-1",
  dayIndex: 0,
  title: "Easy strength",
  rationale: "Build a steady base.",
  intensity: "moderate",
  steps: [
    { name: "Warm up", detail: "Move gently", durationMin: 5 },
    { name: "Main set", detail: "Stay smooth", durationMin: 20 },
  ],
  ...overrides,
});

const plan = (sessions: PlanSession[]): TrainingPlan => ({
  id: "plan-1",
  weekStartIso: "2026-11-09T08:00:00.000Z",
  generatedFromGoal: "Build consistency",
  sessions,
});

describe("plan metrics", () => {
  it("sums a session only when every step has a duration", () => {
    expect(sessionDurationMin(session())).toBe(25);
    expect(
      sessionDurationMin(
        session({ steps: [{ name: "Walk", detail: "Easy", durationMin: 15 }, { name: "Mobility", detail: "Relax" }] }),
      ),
    ).toBeNull();
    expect(sessionDurationMin(session({ steps: [] }))).toBeNull();
  });

  it("does not understate a week containing an unreliable session", () => {
    const complete = session();
    const partial = session({
      id: "session-2",
      dayIndex: 2,
      steps: [{ name: "Run", detail: "Comfortable" }],
    });

    expect(weeklyDurationMin(plan([complete, partial]))).toBeNull();
    expect(
      weeklyDurationMin(
        plan([complete, session({ id: "session-2", dayIndex: 2, steps: [{ name: "Walk", detail: "Easy", durationMin: 10 }] })]),
      ),
    ).toBe(35);
  });

  it("returns only reliable duration, intensity, and step-count metrics", () => {
    expect(sessionMetrics(session())).toEqual([
      { label: "Duration", value: "25 min" },
      { label: "Intensity", value: "Moderate" },
      { label: "Steps", value: "2" },
    ]);
    expect(sessionMetrics(session({ steps: [{ name: "Walk", detail: "Easy" }] }))).toEqual([
      { label: "Intensity", value: "Moderate" },
      { label: "Steps", value: "1" },
    ]);
  });
});
