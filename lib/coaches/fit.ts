import { z } from "zod";
import type { CoachId } from "@/lib/types";

export const coachFitSuggestionSchema = z.object({
  coachId: z.enum(["river", "jax", "sol", "nova", "knox", "riff"]),
  reason: z.string().trim().min(1).max(220),
}).strict();
export type CoachFitSuggestion = z.infer<typeof coachFitSuggestionSchema>;

function requestedStyle(text: string): CoachId | null {
  const value = text.normalize("NFKC").toLowerCase().trim();
  // Deliberate delivery requests only, not training intensity or quoted advice.
  if (/\b(?:don't|do not|never|not more)\b|\b(?:said|says|quoted)\b|[“”"]/.test(value)) return null;
  if (!/^(?:please\s+)?(?:be\b|give me\b|i (?:want|need|would like)\b|can you\b|could you\b|coach me\b)/.test(value)) return null;
  if (/\bi (?:want|need|would like) to be\b|\b(?:energy|energetic) (?:for|during|in) my (?:workouts?|training|runs?)\b/.test(value)) return null;
  const delivery = /\b(?:you|be|coaching|coach|style|tone|replies|delivery|give me)\b/.test(value);
  if (!delivery) return null;
  if (/\b(?:more energetic|more energy|higher energy|more upbeat)\b/.test(value)) return "jax";
  if (/\b(?:calmer|more calm|gentler coaching|lower.energy coaching)\b/.test(value)) return "river";
  if (/\b(?:more force|more forceful|firmer accountability)\b/.test(value)) return "sol";
  if (/\b(?:brutal|no excuses|tougher|harsher|harder on me|tough love|high.pressure|stronger accountability)\b/.test(value)) return "knox";
  if (/\b(?:funnier|more jokes|more humou?r|more comedy|make me laugh)\b/.test(value)) return "riff";
  if (/\b(?:more experimentation|more experimental|more analytical|more experiments)\b/.test(value)) return "nova";
  return null;
}
export function isExplicitStyleRequest(text: string): boolean { return requestedStyle(text) !== null; }
const reasons: Record<CoachId, string> = {
  river: "River offers calmer pacing and room to choose.",
  jax: "Jax brings more energy and a concrete next move.",
  sol: "Sol offers direct recommendations and firmer accountability without pressure or shaming.",
  nova: "Nova turns details into practical experiments.",
  knox: "Knox holds you to the plan and doesn’t accept excuses.",
  riff: "Riff coaches with jokes, then gives you the real next step.",
};
export function fixtureCoachFit(text: string, current: CoachId, declined = false): CoachFitSuggestion | null {
  const target = requestedStyle(text);
  return !declined && target && target !== current ? { coachId: target, reason: reasons[target] } : null;
}

export function validatedCoachFit(value: unknown, text: string, current: CoachId, declined = false): CoachFitSuggestion | null {
  const expected = fixtureCoachFit(text, current, declined);
  const parsed = coachFitSuggestionSchema.safeParse(value);
  // The classifier cannot invent a target or supply behavioral instructions as its reason.
  return expected && parsed.success && parsed.data.coachId === expected.coachId ? expected : null;
}
