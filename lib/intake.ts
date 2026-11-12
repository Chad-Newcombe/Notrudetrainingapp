import { z } from "zod";
import type { CoachId } from "@/lib/types";

export const INTAKE_ANSWER_LIMIT = 600;

const answer = z.string().trim().max(INTAKE_ANSWER_LIMIT);

export const intakeInputSchema = z.object({
  coachId: z.enum(["river", "jax", "sol", "nova", "knox", "riff"]),
  goal: answer.min(1),
  routine: answer,
  support: answer,
  progress: answer,
  constraints: answer,
  tone: z.enum(["gentle", "steady", "direct"]),
});

export const intakeBriefSchema = z.object({
  trainingApproach: z.string().trim().max(220),
  supportApproach: z.string().trim().max(220),
  progressSignal: z.string().trim().max(220),
});

export const intakeProposalSchema = intakeBriefSchema.extend({
  reply: z.string().trim().min(1).max(420),
});

export type IntakeInput = z.infer<typeof intakeInputSchema>;
export type IntakeBrief = z.infer<typeof intakeBriefSchema>;
export type IntakeProposal = z.infer<typeof intakeProposalSchema>;

const voices: Record<CoachId, { opening: string; followUp: string; review: string }> = {
  river: {
    opening: "Let’s find a rhythm that fits the week you already have.",
    followUp: "When life gets crowded, how would you like me to help you find your footing again?",
    review: "Here’s the approach I’d start with. Tell me what feels right and change anything that doesn’t.",
  },
  jax: {
    opening: "Let’s find a spot in your week where a small win can actually happen.",
    followUp: "What kind of nudge gets you moving again when the week goes sideways?",
    review: "Here’s our starting game plan. Change whatever would make it more useful on a real day.",
  },
  sol: {
    opening: "Let’s get practical about what fits on a normal week.",
    followUp: "When a session falls through, what would you actually want me to do?",
    review: "Here’s what I’d use to shape your training and check-ins. Correct anything I’ve missed.",
  },
  nova: {
    opening: "I’m curious where movement could slot into a day that already feels like yours.",
    followUp: "If the original plan goes out the window, what would make a reset feel easier?",
    review: "Here’s my first take. Let’s tune it until it sounds like something you’d actually use.",
  },
  knox: {
    opening: "Tell me what your week really looks like. I plan around facts.",
    followUp: "When you want to skip, what should I hold you to?",
    review: "This is what I’ll hold you to. Fix anything that’s wrong now, not later.",
  },
  riff: {
    opening: "Walk me through your week — the real one, not the one in your calendar app.",
    followUp: "When the plan falls apart, do you want a joke first or the fix first?",
    review: "Here’s my first draft. Heckle anything that doesn’t sound like you.",
  },
};

function routineAdjustment(routine: string): string {
  if (/shift|unpredictable|varies|rotating/i.test(routine)) {
    return "Offer flexible training windows and a shorter backup for weeks when the schedule changes.";
  }
  if (/no time|busy|packed|short on time|long days/i.test(routine)) {
    return "Keep sessions short and easy to fit into a busy day.";
  }
  if (/no gym|at home|home only/i.test(routine)) {
    return "Offer home-friendly options and check what equipment is available.";
  }
  return "";
}

export function intakeOpening(coachId: CoachId, goal: string): string {
  const focus = /strength|lift|muscle/i.test(goal)
    ? " Knowing where you train will help me choose exercises that fit."
    : /walk|run|race|marathon/i.test(goal)
      ? " A time you can return to matters more than a perfect first week."
      : "";
  return voices[coachId].opening + focus;
}

export function intakeFollowUp(coachId: CoachId, routine: string): string {
  const adjustment = routineAdjustment(routine);
  return [adjustment, voices[coachId].followUp].filter(Boolean).join(" ");
}

export function respectReminderPreference(note: string, answer: string): string {
  const optOut = /\b(?:no|avoid|skip|don't want|do not want|don't send|do not send|without)\s+(daily\s+)?(?:reminders|nudges)\b/i.exec(answer);
  if (!optOut && !/leave me alone/i.test(answer)) return note;

  const boundary = optOut?.[1]
    ? "Avoid daily reminders."
    : "Wait for me to check in before offering a nudge.";
  if (note.includes(boundary)) return note;
  const combined = [boundary, note].filter(Boolean).join(" ");
  return combined.length <= 220 ? combined : boundary;
}

export function quickIntakeProposal(input: IntakeInput): IntakeProposal {
  const support = input.support;
  const progress = input.progress;
  return {
    reply: voices[input.coachId].review,
    trainingApproach: routineAdjustment(input.routine),
    supportApproach: respectReminderPreference(
      /check in|check-in|accountab|got in the way|help me adjust/i.test(support)
        ? "Ask what got in the way, then help me pick one realistic next step."
        : /smaller|shorter|overwhelm|gentle|no pressure/i.test(support)
          ? "Offer a smaller option and give me room to decide."
          : "",
      support,
    ),
    progressSignal: /consisten|showing up|stick with/i.test(progress)
      ? "Notice when I return to the routine after a disrupted day."
      : /energy|less tired/i.test(progress)
        ? "Check whether I have more energy for everyday activities."
        : /confiden|less intimidated/i.test(progress)
          ? "Notice when starting a session feels easier."
          : "",
  };
}

export function repeatsIntakeAnswer(proposal: IntakeProposal, input: IntakeInput): boolean {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const answers = [input.goal, input.routine, input.support, input.progress, input.constraints]
    .map(normalize)
    .filter((value) => value.length >= 24);
  return Object.values(proposal).some((value) =>
    answers.some((original) => normalize(value).includes(original)),
  );
}
