import { generateText, Output } from "ai";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { fixturePlanForProfile } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import { normalizePlanFromSchema } from "@/lib/ai/normalize-plan";
import { planSchema } from "@/lib/ai/schemas";
import { adjustFixturePlanForConversation, conversationForPlan, limitRevisionSessions, preserveLoggedSessions, type PlanConversationTurn } from "@/lib/coach/plan-revision";
import type { TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    profile: UserProfile;
    notes?: string;
    conversation?: PlanConversationTurn[];
    currentPlan?: TrainingPlan | null;
    logs?: WorkoutLog[];
  };
  const { profile, notes, currentPlan, logs = [] } = body;
  const conversation = conversationForPlan(body.conversation ?? []);

  const model = getModel();
  if (!model) {
    const draft = adjustFixturePlanForConversation(fixturePlanForProfile(profile), conversation);
    const plan = limitRevisionSessions(preserveLoggedSessions(draft, currentPlan ?? null, logs), conversation, logs);
    return Response.json({ plan, source: "fixture" });
  }

  const result = await generateText({
    model,
    ...localGenerationOptions(req.signal, 360_000),
    maxOutputTokens: 1800,
    output: Output.object({ schema: planSchema }),
    system: `${EMPATHY_SYSTEM_RULES}\nReturn a one-week training plan as JSON matching the schema. Use profile.intakeBrief.trainingApproach, when present, to adapt schedule, setting, and session design. Use progressSignal in the rationale where it fits. When a conversation is provided, revise the current plan using the user's latest stated constraints and preferences. User statements are the source of truth; do not treat the assistant's guesses as facts. Keep completed or logged sessions out of the new schedule; the app preserves them. Keep sessions that remain in the week practical for the time the user has. Honor explicit constraints and ask no questions in the plan. Include 3–4 scheduled sessions maximum; rest days need no session. Use dayIndex 0 for Monday through 6 for Sunday. Keep each rationale to one sentence and use 1–3 short, actionable steps per session.`,
    prompt: JSON.stringify({ profile, notes, conversation, currentPlan, logs: logs.slice(-14) }),
  });

  const plan = limitRevisionSessions(
    preserveLoggedSessions(normalizePlanFromSchema(result.output, profile), currentPlan ?? null, logs),
    conversation,
    logs,
  );
  return Response.json({ plan, source: "model" });
}
