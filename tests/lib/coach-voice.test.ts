import { describe, expect, it } from "vitest";
import { fixtureCoachReply } from "@/lib/ai/fixtures";
import { coachVoiceInstructions } from "@/lib/coaches/voice";
import { COACH_PRESETS } from "@/lib/coaches/presets";
import type { UserProfile } from "@/lib/types";

const profile: UserProfile = {
  goalText: "Move more consistently",
  tone: "steady",
  cadence: "conversational",
  motivation: "process_focus",
  channels: ["in_app"],
  coachId: "river",
  trackWeight: false,
  createdAt: "2026-11-10T00:00:00.000Z",
};

describe("coach voices", () => {
  it("gives each coach distinct instructions while limiting each reply to one useful point", () => {
    const voices = COACH_PRESETS.map((coach) =>
      coachVoiceInstructions({ ...profile, coachId: coach.id }),
    );
    expect(new Set(voices).size).toBe(4);
    for (const voice of voices) {
      expect(voice).toContain("one useful point");
      expect(voice).toContain("two short sentences");
      expect(voice).toContain("No lists");
      expect(voice).toContain("Never open with");
      expect(voice).toContain("I see");
      expect(voice).toContain("That's okay");
    }
    expect(voices[0]).toContain("River");
    expect(voices[1]).toContain("Jax");
    expect(voices[2]).toContain("Sol");
    expect(voices[3]).toContain("Nova");
  });

  it("puts explicit user decisions ahead of saved preferences and coach personality", () => {
    const voice = coachVoiceInstructions(profile);
    const explicit = voice.indexOf("latest explicit instruction");
    const preferences = voice.indexOf("saved engagement preferences");
    const personality = voice.indexOf("coach personality");
    expect(explicit).toBeGreaterThan(-1);
    expect(preferences).toBeGreaterThan(explicit);
    expect(personality).toBeGreaterThan(preferences);
    expect(voice).toContain("one concise pushback");
    expect(voice).toContain("adapt to the user's decision");
  });

  it("keeps offline replies short and different for each coach", () => {
    const replies = COACH_PRESETS.map((coach) =>
      fixtureCoachReply("I'm tired today", { ...profile, coachId: coach.id }),
    );
    expect(new Set(replies).size).toBe(4);
    for (const reply of replies) {
      expect(reply.length).toBeLessThan(150);
      expect(reply).not.toMatch(/no pressure|you are not failing/i);
    }
  });
});
