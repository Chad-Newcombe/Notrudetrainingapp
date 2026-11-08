import { describe, it, expect } from "vitest";
import { getHealthSource, getHealthSources } from "@/lib/health/registry";

describe("health registry", () => {
  it("lists all three providers", () => {
    const sources = getHealthSources();
    expect(sources.map((s) => s.id).sort()).toEqual([
      "apple_health",
      "garmin",
      "strava",
    ]);
  });

  it("strava connect returns activities", async () => {
    const strava = getHealthSource("strava");
    const result = await strava.connect();
    expect(result.activities.length).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();
  });

  it("apple health has availability note", () => {
    const apple = getHealthSource("apple_health");
    expect(apple.availabilityNote).toMatch(/native iOS/i);
  });
});
