import type { HealthActivity, HealthSource } from "./types";

const ACTIVITIES: HealthActivity[] = [
  {
    id: "strava-1",
    title: "Morning walk",
    minutes: 35,
    at: "2026-11-07T08:00:00.000Z",
  },
  {
    id: "strava-2",
    title: "Easy ride",
    minutes: 45,
    at: "2026-11-06T17:30:00.000Z",
  },
];

function buildSummary(activities: HealthActivity[]): string {
  const total = activities.reduce((n, a) => n + a.minutes, 0);
  return `Last ${activities.length} activities, ${total} min total`;
}

export const mockStrava: HealthSource = {
  id: "strava",
  label: "Strava",
  async connect() {
    return { summary: buildSummary(ACTIVITIES), activities: ACTIVITIES };
  },
  async disconnect() {},
  async listActivities() {
    return ACTIVITIES;
  },
};
