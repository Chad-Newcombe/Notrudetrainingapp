import type { HealthActivity, HealthSource } from "./types";

const ACTIVITIES: HealthActivity[] = [
  {
    id: "apple-1",
    title: "Outdoor walk",
    minutes: 30,
    at: "2026-11-07T09:10:00.000Z",
  },
  {
    id: "apple-2",
    title: "Mindful cool-down",
    minutes: 12,
    at: "2026-11-06T20:00:00.000Z",
  },
];

function buildSummary(activities: HealthActivity[]): string {
  const total = activities.reduce((n, a) => n + a.minutes, 0);
  return `Last ${activities.length} activities, ${total} min total`;
}

export const mockApple: HealthSource = {
  id: "apple_health",
  label: "Apple Health",
  availabilityNote: "Real sync needs the native iOS app",
  async connect() {
    return { summary: buildSummary(ACTIVITIES), activities: ACTIVITIES };
  },
  async disconnect() {},
  async listActivities() {
    return ACTIVITIES;
  },
};
