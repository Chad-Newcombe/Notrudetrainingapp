import {
  convertToModelMessages,
  generateText,
  Output,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { lastUserText } from "@/lib/ai/coach-messages";
import { classifyPlanIntent } from "@/lib/coach/plan-revision";
import { fixtureCoachReply } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import { coachReplyReminder, coachVoiceInstructions } from "@/lib/coaches/voice";
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

// People phrase plan changes too freely for a pattern match, so the model decides when the pattern misses.
async function asksForPlanChange(model: NonNullable<ReturnType<typeof getModel>>, text: string, signal: AbortSignal): Promise<boolean> {
  if (classifyPlanIntent(text) === "explicit") return true;
  if (!text.trim()) return false;
  try {
    const result = await generateText({
      model, ...localGenerationOptions(signal, 10_000), maxOutputTokens: 20,
      output: Output.object({ schema: z.object({ planChange: z.boolean() }) }),
      system: "Decide whether the message asks to change the user's training plan now: adding, removing, moving, swapping, or replacing sessions or activities, changing how many days they train, or making the plan harder, easier, longer, shorter, new, or different. planChange is true only for such a request or instruction. It is false for questions, feelings, reports of what already happened, saying they can't or don't feel like training without asking for a change, and requests about how the coach talks. Examples: 'add a yoga day' true; 'I want to run more' true; 'swap my run for a bike ride' true; 'can I get a new plan' true; 'this plan is too easy, step it up' true; 'I skipped Tuesday' false; 'I'm not feeling it today' false; 'what should I eat' false; 'be funnier' false; 'can we talk about my plan' false.",
      prompt: text.slice(0, 500),
    });
    return result.output.planChange;
  } catch {
    return false;
  }
}

function buildCoachSystem(body: CoachRequestBody, planChange: boolean): string {
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
    coachReplyReminder(body.profile, lastUserText(body.messages), planChange),
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

  const planChange = await asksForPlanChange(model, lastUserText(body.messages), req.signal);
  const result = streamText({
    model,
    ...localGenerationOptions(req.signal),
    system: buildCoachSystem(body, planChange),
    messages: await convertToModelMessages(body.messages.slice(-16)),
    maxOutputTokens: 140,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    headers: planChange ? { "X-Notrude-Plan-Change": "1" } : undefined,
    onError: () => "Your local coach is unavailable. Check that Ollama is running and try again.",
  });
}
