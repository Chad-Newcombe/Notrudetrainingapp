import { describe, expect, it } from "vitest";
import { intakeFollowUp, intakeInputSchema, quickIntakeProposal, repeatsIntakeAnswer, respectReminderPreference } from "@/lib/intake";

const input = {
  coachId: "river",
  goal: "Build a walking habit",
  routine: "My shifts change every other week and evenings can be unpredictable.",
  support: "Offer me a smaller option when my day gets busy.",
  progress: "I want more energy after work.",
  constraints: "",
  tone: "gentle",
} as const;

describe("coaching intake", () => {
  it("turns answers into coaching decisions and an adaptive follow-up", () => {
    const proposal = quickIntakeProposal(input);
    expect(proposal.trainingApproach).toContain("flexible training windows");
    expect(proposal.supportApproach).toContain("smaller option");
    expect(proposal.progressSignal).toContain("everyday activities");
    expect(intakeFollowUp("river", input.routine)).toContain("weeks when the schedule changes");
    expect(repeatsIntakeAnswer(proposal, input)).toBe(false);
  });

  it("leaves unknown preferences open and recognizes a request for space", () => {
    const proposal = quickIntakeProposal({ ...input, routine: "", support: "No reminders", progress: "" });
    expect(proposal.trainingApproach).toBe("");
    expect(proposal.supportApproach).toBe("Wait for me to check in before offering a nudge.");
    expect(proposal.progressSignal).toBe("");
  });

  it("flags a coach response that repeats a whole answer", () => {
    expect(repeatsIntakeAnswer({ ...quickIntakeProposal(input), reply: `I heard: ${input.routine}` }, input)).toBe(true);
  });

  it("preserves a reminder boundary alongside the coach’s interpretation", () => {
    const support = "Help me adjust when I ask. I do not want daily reminders.";
    const note = "Help choose an easier session after a disruption.";
    expect(respectReminderPreference(note, support)).toBe(`Avoid daily reminders. ${note}`);
    expect(quickIntakeProposal({ ...input, support }).supportApproach).toContain("help me pick");
  });

  it("rejects blank goals and oversized answers", () => {
    expect(intakeInputSchema.safeParse({ ...input, goal: "  " }).success).toBe(false);
    expect(intakeInputSchema.safeParse({ ...input, support: "a".repeat(601) }).success).toBe(false);
  });
});
