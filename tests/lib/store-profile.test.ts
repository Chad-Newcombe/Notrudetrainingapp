import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, getProfile, saveProfile } from "@/lib/store";

describe("profile store", () => {
  beforeEach(async () => {
    await clearAll();
  });

  it("round-trips a profile", async () => {
    await saveProfile({
      goalText: "Lose weight gently",
      tone: "gentle",
      cadence: "brief",
      motivation: "celebrate_wins",
      channels: ["in_app", "text_style"],
      trackWeight: true,
      currentWeightLbs: 400,
      targetWeightLbs: 350,
      createdAt: new Date().toISOString(),
    });
    const p = await getProfile();
    expect(p?.goalText).toBe("Lose weight gently");
    expect(p?.currentWeightLbs).toBe(400);
  });
});
