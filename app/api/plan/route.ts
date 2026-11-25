import { generateText, Output } from "ai";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { fixturePlanForProfile } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import { getCoach } from "@/lib/coaches/presets";
import { normalizePlanFromSchema } from "@/lib/ai/normalize-plan";
import { planSchema } from "@/lib/ai/schemas";
import { adjustFixturePlanForConversation, conversationForPlan, enforceLatestTimeConstraint, limitRevisionSessions, preserveLoggedSessions, type PlanConversationTurn } from "@/lib/coach/plan-revision";
import type { TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

// What separates a coach's week from a list of activities.
const PROGRAMMING_RULES = [
  "Program like a qualified strength and conditioning coach.",
  "Each session lists its steps in order: a 5 to 8 minute warm-up specific to the session, the main work, and a short cooldown when time allows. Use 3 to 7 steps per session, and make step durationMin add up to roughly the session time the user has.",
  "Each step name is one exercise or block (Goblet squat, Easy run). Its detail gives the prescription and one form cue, for example: 3 x 8-10, stop 2 reps short of failure, rest 90 s. Chest up, knees track over toes. Strength sessions have 3 to 5 main exercises. Cardio steps give minutes and effort: easy enough to talk, steady, or intervals with work and rest times.",
  "Fit the goal: muscle gain uses mostly 6 to 12 reps and enough hard sets per muscle each week; strength uses 3 to 6 reps on the main lifts; fat loss combines strength work with conditioning; endurance is mostly easy aerobic work with one harder session.",
  "Across the week, cover squat, hinge, push, pull and core patterns for strength goals, and never put hard sessions for the same muscles on consecutive days.",
  "Use only the equipment and setting the user has, swap movements that load a stated injury for safe ones, and scale to their level: beginners get simpler movements and fewer sets.",
].join(" ");

export async function POST(req: Request) {
  const body = (await req.json()) as {
    profile: UserProfile;
    notes?: string;
    conversation?: PlanConversationTurn[];
    currentPlan?: TrainingPlan | null;
    logs?: WorkoutLog[];
    /** Planning the next week from how the last one went. */
    newWeek?: boolean;
    lastWeek?: TrainingPlan | null;
    training?: unknown;
  };
  const { profile, notes, currentPlan, logs = [] } = body;
  const conversation = conversationForPlan(body.conversation ?? []);

  const model = getModel();
  if (!model) {
    const draft = adjustFixturePlanForConversation(fixturePlanForProfile(profile), conversation);
    const constrained = enforceLatestTimeConstraint(draft, currentPlan ?? null, conversation);
    const plan = limitRevisionSessions(preserveLoggedSessions(constrained, currentPlan ?? null, logs), conversation, logs);
    return Response.json({ plan, source: "fixture" });
  }

  const result = await generateText({
    model,
    ...localGenerationOptions(req.signal, 360_000),
    maxOutputTokens: 4000,
    output: Output.object({ schema: planSchema }),
    system: `${EMPATHY_SYSTEM_RULES}\nReturn a one-week training plan as JSON matching the schema. Use profile.intakeBrief.trainingApproach, when present, to adapt schedule, setting, and session design. Use progressSignal in the rationale where it fits. When a conversation is provided, revise the current plan using the user's latest stated constraints and preferences. When currentPlan is provided, change only what the user asked for and return every other session exactly as it is in currentPlan, with the same day, title, intensity, and steps. Put an added session on a day that has no session. If the user asks for a harder or easier plan, change intensity, duration, or session count to match, starting from the current plan. User statements are the source of truth; do not treat the assistant's guesses as facts. Keep completed or logged sessions out of the new schedule; the app preserves them. Keep sessions that remain in the week practical for the time the user has. Honor explicit constraints and ask no questions in the plan. Include 3–4 scheduled sessions maximum; rest days need no session. Use dayIndex 0 for Monday through 6 for Sunday. Keep each rationale to one sentence, written the way ${getCoach(profile.coachId).name} would say it (${getCoach(profile.coachId).communication}).\n${PROGRAMMING_RULES}`,
    prompt: JSON.stringify(body.newWeek
      ? { task: "Plan the coming week. Build on lastWeek and the training summary: keep what worked, progress gently where sessions felt easy, ease back where they felt hard, and drop load after pain.", profile, lastWeek: body.lastWeek, training: body.training }
      : { profile, notes, conversation, currentPlan, logs: logs.slice(-14) }),
  });

  const constrained = enforceLatestTimeConstraint(
    normalizePlanFromSchema(result.output, profile), currentPlan ?? null, conversation,
  );
  const plan = limitRevisionSessions(
    preserveLoggedSessions(constrained, currentPlan ?? null, logs),
    conversation,
    logs,
  );
  return Response.json({ plan, source: "model" });
}
