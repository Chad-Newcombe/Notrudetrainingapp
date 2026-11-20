import { generateText } from "ai";
import { fixtureCoachReply } from "@/lib/ai/fixtures";
import { getModel, localGenerationOptions } from "@/lib/ai/model";
import { checkInProposal, trainingSummary, upcomingSessions, type Insight, type InsightKind } from "@/lib/coach/insight";
import { cleanCoachText } from "@/lib/coach/messages";
import { getCoach } from "@/lib/coaches/presets";
import { coachVoiceInstructions } from "@/lib/coaches/voice";
import { DAY_LABELS } from "@/lib/dates";
import type { CoachRelationship, SessionFeeling, TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type Body = {
  kind: InsightKind;
  profile: UserProfile;
  relationship?: CoachRelationship | null;
  plan: TrainingPlan | null;
  history?: TrainingPlan[];
  logs?: WorkoutLog[];
  /** The log just saved, for a check-in. */
  logId?: string;
  /** Monday = 0, from the user's own clock. */
  today: number;
};

const TASKS: Record<InsightKind, string> = {
  checkin: "The user just logged a session and told you how it felt. React to that check-in in your own voice, using the facts given. After pain, tell them to ease off and to see a professional if it persists.",
  daily: "Write today's short note for the user's home screen: one thing worth knowing about today, based on today's session (or rest day) and recent training.",
  weekly: "Write a short weekly update on how training is going across the weeks given: what has been consistent and one thing to focus on next. Use only the numbers given.",
};

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const logs = body.logs ?? [];
  const log = body.logId ? logs.find((entry) => entry.id === body.logId) : undefined;
  const feeling: SessionFeeling | undefined = log?.feeling;
  const today = Math.min(6, Math.max(0, Math.round(body.today)));
  const todaySession = body.plan?.sessions.find((session) => session.dayIndex === today) ?? null;

  const proposal = body.kind === "checkin" ? checkInProposal(body.plan, logs, feeling, today) : null;
  const model = getModel();
  if (!model) {
    const prompt = body.kind === "checkin" ? `That session felt ${feeling ?? "fine"}` : "How am I doing?";
    const insight: Insight = {
      message: fixtureCoachReply(feeling === "pain" ? "It hurts a bit" : prompt, body.profile, body.relationship),
      proposal,
    };
    return Response.json({ ...insight, source: "fixture" });
  }

  const coach = getCoach(body.profile.coachId);
  const checkedIn = log && body.plan?.sessions.find((session) => session.id === log.sessionId);
  const context = {
    today: DAY_LABELS[today],
    todaySession: todaySession ? { title: todaySession.title, intensity: todaySession.intensity, minutes: todaySession.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0) } : "rest day",
    upcoming: upcomingSessions(body.plan, logs, today).map((session) => `${DAY_LABELS[session.dayIndex]}: ${session.title}, ${session.intensity}`),
    checkIn: checkedIn ? { session: checkedIn.title, status: log.status, actualMinutes: log.actualMinutes ?? null, felt: log.feeling ?? null } : undefined,
    training: trainingSummary(body.plan, body.history ?? [], logs),
    goal: body.profile.goalText,
  };
  const withProposal = body.kind === "checkin";

  try {
    const system = [
      coachVoiceInstructions(body.profile, body.relationship),
        `Task: ${TASKS[body.kind]}`,
      withProposal ? (proposal
        ? `The app is showing the user this change on a card they can accept or decline: ${proposal.summary} In your second sentence, say in your own voice why that change fits, without repeating its numbers. Suggest nothing else.`
        : "The app is not offering any plan change. Do not suggest a change, a shorter or longer session, or anything to try differently.") : "",
        "Context (JSON, the only facts you may use):",
        JSON.stringify(context),
        `Final check as ${coach.name}: message is at most two short sentences in your own voice, plain text, no lists, no markdown, no quotation marks for emphasis, and no invented numbers, days, clock times, or exercises. Mention only check-ins listed in recentCheckIns, as they are written.`,
      ].filter(Boolean).join("\n\n");
    const prompt = body.kind === "checkin" ? "Respond to my check-in." : body.kind === "daily" ? "What should I know today?" : "How has my training been going?";
    const options = { model, ...localGenerationOptions(req.signal, 60_000), system, prompt };
    const { text: raw } = await generateText({ ...options, maxOutputTokens: 140 });
    const text = cleanCoachText(raw).trim();
    let sentences: string[] = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    // shortcut: phrase list, so a reworded suggestion can slip through; upgrade to a model check if it does.
    // A suggested change with no card to accept is dropped, so the message never offers what the app can't apply.
    if (withProposal && !proposal) {
      const offers = sentences.filter((sentence) => !/\b(?:how about|let'?s|i'?m suggesting|i suggest|we could|you could|try (?:a |adding|making|easing|cutting|keeping)|shorter|longer|instead of|maybe (?:go|add|make|keep))\b/i.test(sentence));
      sentences = offers.length ? offers : sentences.slice(0, 1);
    }
    const insight: Insight = {
      // Small models run long, so code keeps the first two sentences the prompt asks for.
      message: sentences.slice(0, 2).join(" ").replace(/\s+/g, " ").trim(),
      proposal,
    };
    if (!insight.message) throw new Error("Empty message");
    return Response.json({ ...insight, source: "model" });
  } catch (error) {
    console.error("Coach insight failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Your coach is unavailable. Check that Ollama is running and try again." }, { status: 503 });
  }
}
