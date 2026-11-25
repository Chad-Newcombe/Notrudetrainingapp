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
import { cachedSystem, getModel, localGenerationOptions } from "@/lib/ai/model";
import { getCoach } from "@/lib/coaches/presets";
import { asksForDetail, coachReplyReminder, coachVoiceInstructions } from "@/lib/coaches/voice";
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
async function planRequest(model: NonNullable<ReturnType<typeof getModel>>, text: string, plan: TrainingPlan | null | undefined, goal: string, signal: AbortSignal): Promise<{ planChange: boolean; edits: PlanEdit[] }> {
  if (!text.trim()) return { planChange: false, edits: [] };
  try {
    const result = await generateText({
      model, ...localGenerationOptions(signal, 20_000), maxOutputTokens: 600,
      output: Output.object({ schema: z.object({ planChange: z.boolean(), edits: z.array(planEditSchema).max(3) }) }),
      system: cachedSystem(PLAN_EDIT_INSTRUCTIONS),
      prompt: planEditPrompt(text, plan, undefined, goal),
    });
    return result.output;
  } catch {
    const edits = parsePlanEdits(text);
    return { planChange: edits.length > 0 || classifyPlanIntent(text) === "explicit", edits };
  }
}

// The voice and context stay the same through a chat and are cached; the reminder follows the latest message.
function buildCoachSystem(body: CoachRequestBody, planChange: boolean, saved?: string[]) {
  return cachedSystem([
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
  ].join("\n\n"), coachReplyReminder(body.profile, lastUserText(body.messages), planChange, saved));
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

  const { planChange, edits } = await planRequest(model, userText, body.plan, body.profile.goalText ?? "", req.signal);
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
    // Code writes the confirmation so the facts are exact; the coach adds one line of coaching on top of it.
    const confirmation = applied.saved.join(" ");
    const coach = getCoach(body.profile.coachId);
    const voice = await generateText({
      model, ...localGenerationOptions(req.signal, 20_000), maxOutputTokens: 80,
      system: `You are ${coach.name}, a training coach. ${coach.voice}`,
      prompt: [
        `The user's goal: ${(body.profile.goalText ?? "").slice(0, 200)}`,
        `They asked: ${userText.slice(0, 300)}`,
        `The app already made this change and showed them: ${confirmation}`,
        `Write one sentence of at most ${coach.id === "knox" ? 12 : 22} words in your own voice that coaches them on this change: the training reason it works, or what to focus on in that session.`,
        "Do not open with praise or agreement such as Nice, Great, Good call, Love, Agreed, or Sure. Do not repeat the confirmation, do not ask a question, and do not add any day, time, or exercise that is not in the confirmation. Plain text only.",
      ].join("\n"),
    }).then((result) => result.text, () => "");
    const line = voice.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
    const days = line.toLowerCase().match(/\b(?:mon|tues|wednes|thurs|fri|satur|sun)day\b/g) ?? [];
    const safe = line.includes(" ") && !/^(?:nice|great|good call|love|agreed|sure)\b/i.test(line)
      && days.every((day) => confirmation.toLowerCase().includes(day))
      && !confirmation.toLowerCase().includes(line.toLowerCase().slice(0, 20));
    return Response.json({ text: safe ? `${confirmation}\n${line}` : confirmation }, { headers: header(applied) });
  }

  // Explanations (form, splits, why) need room; everyday replies stay short.
  return streamText({ ...reply, maxOutputTokens: asksForDetail(userText) ? 700 : 220 }).toUIMessageStreamResponse({
    sendReasoning: false,
    headers: planChange ? header(null) : undefined,
    onError: () => "Your local coach is unavailable. Check that Ollama is running and try again.",
  });
}
