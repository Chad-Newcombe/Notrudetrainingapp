import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { clearAll, getProfile, saveProfile } from "@/lib/store";
import { getDb } from "@/lib/store/db";
import type { UserProfile } from "@/lib/types";

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
      coachId: "jax",
      trackWeight: true,
      currentWeightLbs: 400,
      targetWeightLbs: 350,
      createdAt: new Date().toISOString(),
    });
    const p = await getProfile();
    expect(p?.goalText).toBe("Lose weight gently");
    expect(p?.currentWeightLbs).toBe(400);
    expect(p?.coachId).toBe("jax");
  });

  it("uses River for a profile saved before coach selection", async () => {
    const legacy: Omit<UserProfile, "coachId" | "appearance"> = {
      goalText: "Build a walking habit",
      tone: "direct",
      cadence: "brief",
      motivation: "accountability",
      channels: ["in_app"],
      trackWeight: false,
      createdAt: "2026-11-08T12:00:00.000Z",
    };
    const db = await getDb();
    await db.put("meta", legacy as UserProfile, "profile");

    expect(await getProfile()).toEqual({
      ...legacy,
      coachId: "river",
      appearance: "system",
    });
  });

  it("round-trips an explicit appearance preference", async () => {
    const profile: UserProfile = {
      goalText: "Build durable strength",
      tone: "steady",
      cadence: "brief",
      motivation: "process_focus",
      channels: ["in_app"],
      coachId: "nova",
      appearance: "dark",
      trackWeight: false,
      createdAt: "2026-11-10T12:00:00.000Z",
    };

    await saveProfile(profile);

    expect(await getProfile()).toEqual(profile);
  });
});
