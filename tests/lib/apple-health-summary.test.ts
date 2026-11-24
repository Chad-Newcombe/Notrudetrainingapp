import { expect, it, vi } from "vitest";
vi.mock("@/lib/store", () => ({ saveHealth: async () => undefined }));
const { summarizeAppleHealth } = await import("@/lib/health/apple");

it("sums workouts, averages logged step days, and counts each night once", () => {
  const summary = summarizeAppleHealth({
    workouts: [
      { workoutType: "traditionalStrengthTraining", duration: 2700, startDate: "2026-11-18T06:00:00Z" },
      { workoutType: "running", duration: 1800, startDate: "2026-11-19T06:00:00Z" },
    ],
    dailySteps: [8000, 0, 10000],
    sleep: [
      { startDate: "2026-11-19T23:00:00Z", endDate: "2026-11-20T03:00:00Z", sleepState: "deep" },
      { startDate: "2026-11-20T03:00:00Z", endDate: "2026-11-20T06:00:00Z", sleepState: "light" },
      { startDate: "2026-11-20T06:00:00Z", endDate: "2026-11-20T06:30:00Z", sleepState: "awake" },
    ],
    restingHeartRate: 58.4,
    weightKg: 90,
  });
  expect(summary).toBe("2 workouts in 14 days, 75 min total (strength training, running); 9,000 steps a day; 7.0 h sleep a night; resting heart rate 58 bpm; weight 198 lb");
});

it("says plainly when there is nothing to report", () => {
  expect(summarizeAppleHealth({ workouts: [], dailySteps: [], sleep: [] })).toBe("No recent workouts, steps, or sleep in Apple Health.");
});
