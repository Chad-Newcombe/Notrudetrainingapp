import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { demoProfileFor, seedDemoProfile } from "@/lib/demo/seed";
import { getPlan, getProfile } from "@/lib/store";
import { clearAll } from "@/lib/store/db";

describe("demo seed", () => {
  beforeEach(async () => {
    await clearAll();
  });

  it("builds ultra and gentle-start personas", () => {
    expect(demoProfileFor("ultra").goalText).toMatch(/ultra/i);
    expect(demoProfileFor("gentle-start").currentWeightLbs).toBeGreaterThanOrEqual(
      300,
    );
  });

  it("persists profile and plan", async () => {
    await seedDemoProfile("ultra");
    const profile = await getProfile();
    const plan = await getPlan();
    expect(profile?.goalText).toMatch(/ultra/i);
    expect(plan?.sessions.length).toBeGreaterThan(0);
  });
});
