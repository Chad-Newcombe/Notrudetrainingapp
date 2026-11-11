// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { TodaySession } from "@/components/today/TodaySession";
import type { PlanSession, TrainingPlan, UserProfile } from "@/lib/types";

const workout: PlanSession = {
  id: "strength-1",
  dayIndex: 2,
  title: "Steady strength",
  rationale: "Build useful strength without draining the rest of your week.",
  intensity: "moderate",
  steps: [
    { name: "Warm up", detail: "Move gently", durationMin: 5 },
    { name: "Strength circuit", detail: "Three smooth rounds", durationMin: 20 },
  ],
};

const plan: TrainingPlan = {
  id: "plan-1",
  weekStartIso: "2026-11-09T08:00:00.000Z",
  generatedFromGoal: "Build consistency",
  sessions: [workout],
};

const profile: UserProfile = {
  goalText: "Build consistency",
  tone: "steady",
  cadence: "brief",
  motivation: "process_focus",
  channels: ["in_app"],
  trackWeight: false,
  coachId: "river",
  createdAt: "2026-11-09T08:00:00.000Z",
};

describe("TodaySession", () => {
  afterEach(async () => {
    cleanup();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  it("presents one workout with real metrics, week context, and one coach note", () => {
    render(
      createElement(TodaySession, {
        session: workout,
        plan,
        logs: [],
        profile,
      }),
    );

    expect(screen.getByRole("heading", { level: 1, name: "Steady strength" })).toBeInTheDocument();
    const week = screen.getByLabelText("Week at a glance");
    expect(within(week).getAllByRole("listitem")).toHaveLength(7);
    expect(within(week).getByRole("listitem", { name: /Wednesday 11, scheduled, today/i })).toBeInTheDocument();
    expect(within(week).getByRole("listitem", { name: /Monday 9, rest day/i })).toBeInTheDocument();
    expect(screen.getByText("25 min")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start workout" })).toHaveAttribute("href", "/workout/strength-1");
    expect(screen.getByLabelText("Coach note")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("switches the primary action to review after the session is logged", () => {
    render(
      createElement(TodaySession, {
        session: workout,
        plan,
        logs: [{ id: "log-1", sessionId: workout.id, status: "completed", completedAt: "2026-11-11T18:00:00.000Z" }],
        profile,
        loggedToday: true,
      }),
    );

    expect(screen.getByRole("link", { name: "Review workout" })).toBeInTheDocument();
  });
});
