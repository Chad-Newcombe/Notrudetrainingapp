import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { lastUserText } from "@/lib/ai/coach-messages";
import { fixtureCoachReply } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import { getCoach } from "@/lib/coaches/presets";
import type { TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type CoachRequestBody = {
  messages: UIMessage[];
  profile: UserProfile;
  plan?: TrainingPlan | null;
  logs?: WorkoutLog[];
  healthSummary?: string;
};

function buildCoachSystem(body: CoachRequestBody): string {
  const coach = getCoach(body.profile.coachId);
  return [
    EMPATHY_SYSTEM_RULES,
    `You are ${coach.name}, the user's in-app coach. Your default style is ${coach.vibe}. Match the user's chosen tone and cadence.`,
    "Context (JSON):",
    JSON.stringify({
      profile: body.profile,
      plan: body.plan ?? null,
      logs: body.logs?.slice(-7) ?? [],
      healthSummary: body.healthSummary ?? null,
    }),
  ].join("\n\n");
}

export async function POST(req: Request) {
  const body = (await req.json()) as CoachRequestBody;

  const model = getModel();
  if (!model) {
    const userText = lastUserText(body.messages);
    const text = fixtureCoachReply(userText, body.profile);
    return Response.json(
      { text },
      {
        status: 200,
        headers: { "X-Notrude-Fixture": "1" },
      },
    );
  }

  const result = streamText({
    model,
    ...localGenerationOptions(req.signal),
    system: buildCoachSystem(body),
    messages: await convertToModelMessages(body.messages.slice(-16)),
    maxOutputTokens: 400,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    onError: () => "Your local coach is unavailable. Check that Ollama is running and try again.",
  });
}
