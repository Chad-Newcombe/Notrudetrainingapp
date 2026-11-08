import type { HealthActivity, HealthSource } from "./types";

const ACTIVITIES: HealthActivity[] = [
  {
    id: "garmin-1",
    title: "Strength session",
    minutes: 28,
    at: "2026-11-07T06:45:00.000Z",
  },
  {
    id: "garmin-2",
    title: "Lunch walk",
    minutes: 22,
    at: "2026-11-05T12:15:00.000Z",
  },
];

function buildSummary(activities: HealthActivity[]): string {
  const total = activities.reduce((n, a) => n + a.minutes, 0);
  return `Last ${activities.length} activities, ${total} min total`;
}

export const mockGarmin: HealthSource = {
  id: "garmin",
  label: "Garmin",
  async connect() {
    return { summary: buildSummary(ACTIVITIES), activities: ACTIVITIES };
  },
  async disconnect() {},
  async listActivities() {
    return ACTIVITIES;
  },
};
