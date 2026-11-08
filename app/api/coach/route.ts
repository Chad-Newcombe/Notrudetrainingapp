import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { EMPATHY_SYSTEM_RULES } from "@/lib/ai/empathy";
import { lastUserText } from "@/lib/ai/coach-messages";
import { fixtureCoachReply } from "@/lib/ai/fixtures";
import { getModel, hasAiKey } from "@/lib/ai/model";
import type { TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type CoachRequestBody = {
  messages: UIMessage[];
  profile: UserProfile;
  plan?: TrainingPlan | null;
  logs?: WorkoutLog[];
  healthSummary?: string;
};

function buildCoachSystem(body: CoachRequestBody): string {
  return [
    EMPATHY_SYSTEM_RULES,
    "You are the in-app coach. Answer in plain language matching the user's tone and cadence.",
    "Context (JSON):",
    JSON.stringify({
      profile: body.profile,
      plan: body.plan ?? null,
      logs: body.logs ?? [],
      healthSummary: body.healthSummary ?? null,
    }),
  ].join("\n\n");
}

export async function POST(req: Request) {
  const body = (await req.json()) as CoachRequestBody;

  if (!hasAiKey()) {
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
    model: getModel(),
    system: buildCoachSystem(body),
    messages: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse();
}
