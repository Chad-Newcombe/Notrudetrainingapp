import { afterEach, describe, expect, it } from "vitest";
import { dayIndexInPlanWeek, weekStartIso } from "@/lib/dates";

const savedTz = process.env.TZ;

afterEach(() => {
  if (savedTz === undefined) delete process.env.TZ;
  else process.env.TZ = savedTz;
});

describe("dayIndexInPlanWeek", () => {
  it("aligns plan week with local Monday from weekStartIso (America/Los_Angeles)", () => {
    process.env.TZ = "America/Los_Angeles";
    const mondayStart = weekStartIso(new Date("2025-11-03T20:00:00.000Z")); // Mon Nov 3 local
    const wed = new Date("2025-11-06T01:00:00.000Z"); // Tue evening UTC = Wed morning LA
    expect(dayIndexInPlanWeek(mondayStart, wed)).toBe(2);
  });

  it("returns null before and after the stored Mon–Sun window (America/New_York)", () => {
    process.env.TZ = "America/New_York";
    const mondayStart = "2025-11-10T05:00:00.000Z"; // Mon Nov 10 00:00 EST
    const priorSunday = new Date("2025-11-09T15:00:00.000Z");
    const nextMonday = new Date("2025-11-17T14:00:00.000Z");
    expect(dayIndexInPlanWeek(mondayStart, priorSunday)).toBeNull();
    expect(dayIndexInPlanWeek(mondayStart, nextMonday)).toBeNull();
    expect(dayIndexInPlanWeek(mondayStart, new Date("2025-11-12T15:00:00.000Z"))).toBe(
      2,
    );
  });
});
