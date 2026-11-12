import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { lastUserText } from "@/lib/ai/coach-messages";
import { fixtureCoachReply } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import { coachVoiceInstructions } from "@/lib/coaches/voice";
import type { CoachRelationship, TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type CoachRequestBody = {
  messages: UIMessage[];
  relationship?: CoachRelationship;
  profile: UserProfile;
  plan?: TrainingPlan | null;
  logs?: WorkoutLog[];
  healthSummary?: string;
  continuationSummary?: string;
};

function buildCoachSystem(body: CoachRequestBody): string {
  return [
    coachVoiceInstructions(body.profile, body.relationship),
    "Use the approved intakeBrief to tailor suggestions, support after disruptions, and how you recognize progress. Use only the relevant notes and turn them into actions or questions. Do not recite the notes or infer missing preferences.",
    "Context (JSON):",
    JSON.stringify({
      profile: body.profile,
      plan: body.plan ?? null,
      logs: body.logs?.slice(-7) ?? [],
      healthSummary: body.healthSummary ?? null,
      continuationSummary: typeof body.continuationSummary === "string" && body.messages.filter((message) => message.role === "user").length === 1 ? body.continuationSummary.slice(0, 220) : undefined,
    }),
  ].join("\n\n");
}

export async function POST(req: Request) {
  const body = (await req.json()) as CoachRequestBody;

  const model = getModel();
  if (!model) {
    const userText = lastUserText(body.messages);
    const text = fixtureCoachReply(userText, body.profile, body.relationship);
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
    maxOutputTokens: 140,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    onError: () => "Your local coach is unavailable. Check that Ollama is running and try again.",
  });
}
