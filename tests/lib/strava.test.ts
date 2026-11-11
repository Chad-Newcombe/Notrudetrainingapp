import { describe, expect, it } from "vitest";
import { stravaAuthorizationUrl, summarizeStravaActivities } from "@/lib/health/strava";

describe("Strava boundary helpers", () => {
  it("builds a web OAuth URL with state and read-only activity scope", () => {
    const url = new URL(stravaAuthorizationUrl({
      clientId: "12345",
      redirectUri: "http://127.0.0.1:4310/api/health/strava/callback",
      state: "single-use-state",
    }));

    expect(url.origin + url.pathname).toBe("https://www.strava.com/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "12345",
      redirect_uri: "http://127.0.0.1:4310/api/health/strava/callback",
      response_type: "code",
      approval_prompt: "auto",
      scope: "activity:read_all",
      state: "single-use-state",
    });
  });

  it("summarizes real activity durations from moving time", () => {
    expect(summarizeStravaActivities([
      { id: 1, name: "Morning Run", moving_time: 1_800, start_date: "2026-11-09T08:00:00Z", type: "Run" },
      { id: 2, name: "Lunch Walk", moving_time: 900, start_date: "2026-11-08T20:00:00Z", type: "Walk" },
    ])).toBe("2 recent activities · 45 min moving");
  });

  it("explains an empty Strava history without inventing activity", () => {
    expect(summarizeStravaActivities([])).toBe("Connected · no recent activities found");
  });
});
