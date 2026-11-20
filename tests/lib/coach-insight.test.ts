import { describe, expect, it } from "vitest";
import { checkInProposal, safeProposal, trainingSummary } from "@/lib/coach/insight";
import type { TrainingPlan, WorkoutLog } from "@/lib/types";

const week: TrainingPlan = {
  id: "w", weekStartIso: "2026-11-16T08:00:00.000Z", generatedFromGoal: "g",
  sessions: [
    { id: "mon", dayIndex: 0, title: "Easy run", rationale: "r", intensity: "easy", steps: [{ name: "Run", detail: "d", durationMin: 30 }] },
    { id: "thu", dayIndex: 3, title: "Strength", rationale: "r", intensity: "moderate", steps: [{ name: "Lift", detail: "d", durationMin: 40 }] },
    { id: "sat", dayIndex: 5, title: "Long run", rationale: "r", intensity: "moderate", steps: [{ name: "Run", detail: "d", durationMin: 60 }] },
  ],
};
const logs: WorkoutLog[] = [{ id: "l1", sessionId: "mon", status: "completed", completedAt: "2026-11-16T18:00:00.000Z", actualMinutes: 25, feeling: "easy" }];
const today = 2; // Wednesday

describe("coach insight", () => {
  it("summarises only real numbers from plans and check-ins", () => {
    const summary = trainingSummary(week, [], logs);
    expect(summary.weeks[0]).toMatchObject({ plannedSessions: 3, plannedMinutes: 130, done: 1, actualMinutes: 25, felt: ["easy"] });
    expect(summary.recentCheckIns[0]).toMatchObject({ session: "Monday Easy run", plannedMinutes: 30, actualMinutes: 25, felt: "easy" });
  });

  it("keeps a proposal that changes one upcoming session", () => {
    const proposal = { summary: "Add ten minutes to Saturday's long run.", edits: [{ op: "set" as const, day: "saturday" as const, minutes: 70 }] };
    expect(safeProposal(week, logs, proposal, "easy", today)).toEqual({ summary: "Long run on Saturday is now 70 minutes.", edits: proposal.edits });
  });

  it("drops proposals that touch past or logged sessions, cannot apply, or add load after pain", () => {
    const edit = (e: object) => ({ summary: "Change it.", edits: [e as never] });
    expect(safeProposal(week, logs, edit({ op: "harder", day: "monday" }), "easy", today)).toBeNull();
    expect(safeProposal(week, [], edit({ op: "harder" }), "easy", today)).toBeNull(); // would change Monday, already past
    expect(safeProposal(week, logs, edit({ op: "remove", activity: "swimming" }), "easy", today)).toBeNull();
    expect(safeProposal(week, logs, edit({ op: "harder", day: "saturday" }), "pain", today)).toBeNull();
    expect(safeProposal(week, logs, edit({ op: "easier", day: "saturday" }), "pain", today)).not.toBeNull();
    expect(safeProposal(week, logs, edit({ op: "set", day: "saturday", intensity: "moderate" }), "easy", today)).toBeNull(); // already moderate
    const untimed = { ...week, sessions: week.sessions.map((session) => session.id === "sat" ? { ...session, intensity: "easy" as const, steps: [{ name: "Stretch", detail: "d" }] } : session) };
    expect(safeProposal(untimed, logs, edit({ op: "easier", day: "saturday" }), "hard", today)).toBeNull(); // nothing visible changes
  });

  it("offers a step up only after two easy sessions in a row, and eases back after hard or pain", () => {
    expect(checkInProposal(week, logs, "easy", today)).toBeNull(); // one easy session is not a pattern
    const twoEasy = [{ ...logs[0], id: "l0", sessionId: "old" }, ...logs];
    expect(checkInProposal(week, twoEasy, "easy", today)).toEqual({ summary: "Strength on Thursday is now 50 minutes and hard.", edits: [{ op: "harder", day: "thursday" }] });
    expect(checkInProposal(week, logs, "pain", today)?.edits).toEqual([{ op: "easier", day: "thursday" }]);
    expect(checkInProposal(week, logs, "right", today)).toBeNull();
  });
});
