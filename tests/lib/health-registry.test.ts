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

  it("marks Strava as the only web OAuth provider", () => {
    const strava = getHealthSource("strava");
    expect(strava.mode).toBe("oauth");
    expect(strava.actionLabel).toBe("Connect Strava");
  });

  it("does not pretend native and partner-only providers can connect on the web", () => {
    const apple = getHealthSource("apple_health");
    const garmin = getHealthSource("garmin");
    expect(apple.mode).toBe("native_required");
    expect(apple.availabilityNote).toMatch(/HealthKit.*iOS/i);
    expect(garmin.mode).toBe("partner_required");
    expect(garmin.availabilityNote).toMatch(/developer program/i);
  });
});
