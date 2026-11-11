// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { WeekPlan } from "@/components/plan/WeekPlan";
import type { TrainingPlan, WorkoutLog } from "@/lib/types";

const plan: TrainingPlan = {
  id: "plan-1",
  weekStartIso: "2026-11-09T08:00:00.000Z",
  generatedFromGoal: "Build consistency",
  sessions: [
    {
      id: "monday",
      dayIndex: 0,
      title: "Easy walk",
      rationale: "Start smoothly.",
      intensity: "easy",
      steps: [{ name: "Walk", detail: "Comfortable", durationMin: 20 }],
    },
    {
      id: "wednesday",
      dayIndex: 2,
      title: "Steady strength",
      rationale: "Build useful strength.",
      intensity: "moderate",
      steps: [{ name: "Circuit", detail: "Three rounds", durationMin: 25 }],
    },
  ],
};

const logs: WorkoutLog[] = [
  { id: "log-1", sessionId: "monday", status: "completed", completedAt: "2026-11-09T18:00:00.000Z" },
];

describe("WeekPlan", () => {
  it("renders the stored week as seven schedule rows without inventing more weeks", () => {
    render(createElement(WeekPlan, { plan, logs }));

    const schedule = screen.getByLabelText("This week schedule");
    expect(within(schedule).getAllByRole("listitem")).toHaveLength(7);
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
      expect(within(schedule).getByText(day)).toBeInTheDocument();
    }
    expect(within(schedule).getAllByText("Rest day")).toHaveLength(5);
    expect(within(schedule).getByText("Completed")).toBeInTheDocument();
    expect(within(schedule).getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("45 min scheduled")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next week|previous week/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Discuss changes with coach" })).toHaveAttribute("href", "/coach");
  });
});
