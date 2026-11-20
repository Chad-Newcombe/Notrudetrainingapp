// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

vi.mock("@/lib/store/coach-conversations", () => ({ startCoachConversation: () => new Promise(() => {}) }));
const { BentoHome } = await import("@/components/today/BentoHome");

const profile: UserProfile = { goalText: "Move more", tone: "steady", cadence: "brief", motivation: "process_focus", channels: ["in_app"], coachId: "knox", trackWeight: false, createdAt: "2026-11-01T00:00:00.000Z" };
const plan: TrainingPlan = {
  id: "p", weekStartIso: new Date("2026-11-16T00:00:00").toISOString(), generatedFromGoal: "g",
  sessions: [
    { id: "tue", dayIndex: 1, title: "Easy run", rationale: "r", intensity: "easy", steps: [{ name: "Run", detail: "d", durationMin: 30 }] },
    { id: "wed", dayIndex: 2, title: "Strength", rationale: "r", intensity: "moderate", steps: [{ name: "Lift", detail: "d", durationMin: 40 }] },
  ],
};
const logs: WorkoutLog[] = [{ id: "l", sessionId: "tue", status: "completed", completedAt: "2026-11-17T18:00:00.000Z", actualMinutes: 25, feeling: "easy" }];

describe("BentoHome", () => {
  beforeAll(() => { vi.useFakeTimers({ now: new Date("2026-11-18T09:00:00"), toFake: ["Date"] }); });
  afterAll(() => { vi.useRealTimers(); });
  afterEach(() => cleanup());

  it("shows today's session, real week numbers, the coach's note, and skip and done for today", () => {
    render(createElement(BentoHome, { profile, plan, history: [], logs, dailyNote: "Thirty minutes. Hold the time.", weeklyNote: null, onPlanNewWeek: () => {}, planning: "idle", onCoachClosed: () => {} }));
    const today = within(screen.getByRole("region", { name: "Today" }));
    expect(today.getByText("Strength")).toBeInTheDocument();
    expect(today.getByText("1/2")).toBeInTheDocument();
    expect(today.getByText("25")).toBeInTheDocument(); // actual minutes, not planned
    expect(today.getByText("Thirty minutes. Hold the time.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mark Strength done" })).toHaveAttribute("href", "/workout/wed?checkin=1");
    expect(screen.getByRole("link", { name: "Skip Strength" })).toHaveAttribute("href", "/workout/wed?skip=1");
  });

  it("opens the coach on glass from the orb and closes it again", () => {
    const { container } = render(createElement(BentoHome, { profile, plan, history: [], logs, dailyNote: null, weeklyNote: null, onPlanNewWeek: () => {}, planning: "idle", onCoachClosed: () => {} }));
    const dialog = container.querySelector('[role="dialog"]')!; // hidden from the accessibility tree while closed
    expect(dialog).toHaveAttribute("aria-label", "Chat with Knox");
    expect(dialog).not.toHaveAttribute("data-open");
    fireEvent.click(screen.getByRole("button", { name: "Talk to Knox" }));
    expect(dialog).toHaveAttribute("data-open");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(dialog).not.toHaveAttribute("data-open");
  });
});
