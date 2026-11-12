import { expect, it } from "vitest";
import { fixtureCoachReply } from "@/lib/ai/fixtures";
import { COACH_PRESETS } from "@/lib/coaches/presets";
import { fixtureCoachFit, isExplicitStyleRequest } from "@/lib/coaches/fit";
import type { UserProfile } from "@/lib/types";
const profile: UserProfile = { coachId: "river", goalText: "Walk", tone: "steady", cadence: "brief", motivation: "process_focus", channels: ["in_app"], trackWeight: false, createdAt: "now" };
for (const text of ["I missed my workout", "Move my walk to Friday", "Move my Monday walk to Friday", "Stop reassuring me", "I want you to be a high-pressure accountability coach"]) {
  it(`keeps all six identities concise and useful for ${text}`, () => {
    const replies = COACH_PRESETS.map(({ id }) => fixtureCoachReply(text, { ...profile, coachId: id }));
    expect(new Set(replies).size).toBe(6);
    for (const reply of replies) {
      expect(reply).not.toMatch(/I see|I hear|No pressure|You've got this|Just say yes or no|\?/i);
      expect(reply.split(/[.!]+/).filter((s) => s.trim()).length).toBeLessThanOrEqual(2);
      if (text.startsWith("Move")) expect(reply).toMatch(/Friday/);
      if (text.startsWith("Stop")) expect(reply).toMatch(/reassurance|practical|recommendation|action/i);
    }
  });
}
for (const text of ["Be more energetic", "I want a calmer coaching style", "Give me more experimentation", "I want you to be a high-pressure accountability coach", "Be funnier", "I want a brutal no excuses coach"]) {
  it(`recognizes a deliberate style request: ${text}`, () => expect(isExplicitStyleRequest(text)).toBe(true));
}
for (const text of ["I need more energy for my workout", "Give me more energy for my workouts", "I want to be more energetic", "Make my workouts harder", "I missed a workout", "Don't be more forceful", "Sol said be more energetic", "Can I experiment with my running pace?"]) {
  it(`does not classify training or quoted/negated style as a switch: ${text}`, () => expect(isExplicitStyleRequest(text)).toBe(false));
}
it("suggests an appropriate alternative only outside the current coach's range", () => {
  expect(fixtureCoachFit("Be more energetic", "river")?.coachId).toBe("jax");
  expect(fixtureCoachFit("Be more energetic", "jax")).toBeNull();
  expect(fixtureCoachFit("Be slightly firmer", "river")).toBeNull();
  expect(fixtureCoachFit("I want a calmer coaching style", "jax")?.coachId).toBe("river");
  expect(fixtureCoachFit("Give me more experimentation", "sol")?.coachId).toBe("nova");
  expect(fixtureCoachFit("I want you to be a high-pressure accountability coach", "river")?.coachId).toBe("knox");
  expect(fixtureCoachFit("Be funnier", "sol")?.coachId).toBe("riff");
  expect(fixtureCoachFit("Be funnier", "riff")).toBeNull();
});

it("honors an explicit decision to stay without repeating a suggestion", () => {
  const relationship = { coachId: "river" as const, learnedPreferences: [], rejectedPatterns: [], declinedSwitchSuggestion: true, updatedAt: "now" };
  const reply = fixtureCoachReply("I want you to be a high-pressure accountability coach", profile, relationship);
  expect(reply).not.toMatch(/Sol|Knox|switch|pressure/i);
  expect(reply).toMatch(/choice still yours/);
});
