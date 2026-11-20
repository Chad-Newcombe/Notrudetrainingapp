import {
  convertToModelMessages,
  generateText,
  Output,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { lastUserText } from "@/lib/ai/coach-messages";
import { applyPlanEdits, parsePlanEdits, PLAN_EDIT_INSTRUCTIONS, planEditPrompt, planEditSchema, summarizePlanEdits, type PlanEdit } from "@/lib/coach/plan-edit";
import { classifyPlanIntent } from "@/lib/coach/plan-revision";
import { fixtureCoachReply } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import { getCoach } from "@/lib/coaches/presets";
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

// People phrase plan changes too freely for a pattern match, so the model decides and names the exact edit.
async function planRequest(model: NonNullable<ReturnType<typeof getModel>>, text: string, plan: TrainingPlan | null | undefined, signal: AbortSignal): Promise<{ planChange: boolean; edits: PlanEdit[] }> {
  if (!text.trim()) return { planChange: false, edits: [] };
  try {
    const result = await generateText({
      model, ...localGenerationOptions(signal, 20_000), maxOutputTokens: 200,
      output: Output.object({ schema: z.object({ planChange: z.boolean(), edits: z.array(planEditSchema).max(3) }) }),
      system: PLAN_EDIT_INSTRUCTIONS,
      prompt: planEditPrompt(text, plan),
    });
    return result.output;
  } catch {
    const edits = parsePlanEdits(text);
    return { planChange: edits.length > 0 || classifyPlanIntent(text) === "explicit", edits };
  }
}

function buildCoachSystem(body: CoachRequestBody, planChange: boolean, saved?: string[]): string {
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
    coachReplyReminder(body.profile, lastUserText(body.messages), planChange, saved),
  ].join("\n\n");
}

export async function POST(req: Request) {
  const body = (await req.json()) as CoachRequestBody;

  const userText = lastUserText(body.messages);
  const notes: string[] = [];
  const apply = (edits: PlanEdit[]) => {
    notes.length = 0;
    const edited = applyPlanEdits(body.plan, edits, body.logs, userText, undefined, notes);
    return edited ? { edits, edited, saved: summarizePlanEdits(body.plan ?? null, edited, edits, notes) } : null;
  };
  const header = (applied: ReturnType<typeof apply>) => ({ "X-Notrude-Plan-Change": applied ? encodeURIComponent(JSON.stringify(applied.edits)) : "1" });

  const model = getModel();
  if (!model) {
    const applied = apply(parsePlanEdits(userText));
    return Response.json(
      { text: applied ? applied.saved.join(" ") : fixtureCoachReply(userText, body.profile, body.relationship) },
      { status: 200, headers: { "X-Notrude-Fixture": "1", ...(applied ? header(applied) : {}) } },
    );
  }

  const { planChange, edits } = await planRequest(model, userText, body.plan, req.signal);
  // The edit is applied before the reply so the coach confirms what was actually saved.
  const applied = planChange ? apply(edits) ?? apply(parsePlanEdits(userText)) : null;
  const plan = applied?.edited ?? body.plan;
  const reply = {
    model,
    ...localGenerationOptions(req.signal),
    system: buildCoachSystem({ ...body, plan }, planChange, applied?.saved),
    messages: await convertToModelMessages(body.messages.slice(-16)),
  };

  if (applied) {
    // Small models garble days and minutes, so code writes the confirmation and the coach adds one line that states no schedule facts.
    const confirmation = applied.saved.join(" ");
    const coach = getCoach(body.profile.coachId);
    // The model gets no plan or message here, so it has no schedule facts to get wrong.
    const voice = await generateText({
      model, ...localGenerationOptions(req.signal, 20_000), maxOutputTokens: 40,
      system: `You are ${coach.name}, a training coach. ${coach.voice}`,
      prompt: "The user just asked for a change to their training plan and the app has already confirmed it to them. Write one sentence of at most 14 words, in your own voice, reacting to them having made the change. Do not mention any day, number, activity, or what the change was. Do not ask a question. Plain text only.",
    }).then((result) => result.text, () => "");
    const line = voice.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
    const safe = line.includes(" ") && !/\d|\b(?:mon|tues|wednes|thurs|fri|satur|sun)day|\btoday\b|\btomorrow\b/i.test(line)
      && !confirmation.toLowerCase().includes(line.toLowerCase().slice(0, 20));
    return Response.json({ text: safe ? `${confirmation}\n${line}` : confirmation }, { headers: header(applied) });
  }

  return streamText({ ...reply, maxOutputTokens: 140 }).toUIMessageStreamResponse({
    sendReasoning: false,
    headers: planChange ? header(null) : undefined,
    onError: () => "Your local coach is unavailable. Check that Ollama is running and try again.",
  });
}
