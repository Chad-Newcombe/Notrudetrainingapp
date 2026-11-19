import { z } from "zod";
import { describePlanChanges, shiftSessionEffort } from "@/lib/coach/plan-revision";
import { DAY_LABELS } from "@/lib/dates";
import { createId } from "@/lib/ids";
import type { PlanSession, TrainingPlan, WorkoutLog } from "@/lib/types";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const day = z.enum(DAYS).nullish();

export const planEditSchema = z.object({
  op: z.enum(["add", "remove", "move", "replace", "set", "harder", "easier", "rewrite"]),
  day,
  activity: z.string().nullish(),
  toDay: day,
  newActivity: z.string().nullish(),
  minutes: z.number().nullish(),
  intensity: z.enum(["easy", "moderate", "hard"]).nullish(),
});
export type PlanEdit = z.infer<typeof planEditSchema>;

export const PLAN_EDIT_INSTRUCTIONS = [
  "You turn one chat message into edits to the user's weekly training plan.",
  "planChange is true only when the message asks to change the plan now: adding, removing, moving, swapping, or replacing sessions or activities, changing how many days they train, or making the plan harder, easier, longer, shorter, new, or different. It is false for questions, feelings, reports of what already happened, saying they can't or don't feel like training without asking for a change, and requests about how the coach talks. When it is false, edits is empty.",
  "When it is true, list the fewest edits that do exactly what was asked:",
  "add: a new session. newActivity is its name. toDay only if the user named a day.",
  "remove: delete a session, found by day (the day it is on now) or by activity.",
  "move: move a session, found by day or activity, to toDay.",
  "replace: change a session's activity to newActivity, found by day or activity.",
  "set: change the minutes or intensity of one session, found by day or activity.",
  "harder or easier: the whole plan, or one session if the user named its day or activity.",
  "rewrite: anything else, such as a whole new plan or a different number of training days.",
  "Use null for every field the user did not state. Never invent a day, minutes, intensity, or activity.",
  "Examples: 'add a yoga day' gives add with newActivity yoga. 'swap my run for a bike ride' gives replace with activity run and newActivity bike ride. 'move Tuesday to Friday' gives move with day tuesday and toDay friday. 'make Thursday 20 minutes' gives set with day thursday and minutes 20. 'I want a harder plan' gives harder. 'can I get a new plan' gives rewrite. 'I skipped Tuesday', 'I'm not feeling it today', 'what should I eat', and 'be funnier' give planChange false.",
].join("\n");

export function planEditPrompt(text: string, plan: TrainingPlan | null | undefined, today = todayIndex()): string {
  const sessions = (plan?.sessions ?? []).map((s) => `${DAYS[s.dayIndex]}: ${s.title}, ${minutesOf(s)} min, ${s.intensity}`);
  return `Today is ${DAYS[today]}.\nCurrent plan:\n${sessions.join("\n") || "none"}\n\nMessage: ${text.slice(0, 500)}`;
}

const todayIndex = () => (new Date().getDay() + 6) % 7;
const minutesOf = (session: PlanSession) => session.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0);
const titled = (name: string) => name.trim().slice(0, 40).replace(/^./, (c) => c.toUpperCase());
const stem = (word: string) => word.replace(/(.)\1ing$/, "$1").replace(/(?:ing|e|s)$/, "");

function withMinutes(session: PlanSession, minutes: number): PlanSession {
  const total = Math.min(180, Math.max(5, Math.round(minutes)));
  return { ...session, steps: [{ name: session.steps[0]?.name ?? session.title, detail: `${total} minutes, ${session.intensity} effort.`, durationMin: total }] };
}

/**
 * Applies edits in code so nothing else in the week can change.
 * Returns null when an edit cannot be applied exactly; the caller then falls back to a full rewrite.
 */
export function applyPlanEdits(
  plan: TrainingPlan | null | undefined,
  edits: PlanEdit[],
  logs: WorkoutLog[] = [],
  text = "",
  today = todayIndex(),
  notes: string[] = [],
): TrainingPlan | null {
  if (!plan || edits.length === 0) return null;
  const said = text.toLowerCase();
  // Small models invent days, so a day counts only if the user's own message names it.
  const heard = (name: PlanEdit["day"]) => !name || !said ? name
    : new RegExp(`\\b${name.slice(0, 3)}`).test(said)
      || (/\btoday\b/.test(said) && name === DAYS[today])
      || (/\btomorrow\b/.test(said) && name === DAYS[(today + 1) % 7]) ? name : null;
  edits = edits.map((edit) => ({ ...edit, day: heard(edit.day), toDay: heard(edit.toDay) }));
  const logged = new Set(logs.map((log) => log.sessionId));
  let sessions = plan.sessions.map((session) => ({ ...session }));
  const index = (name: PlanEdit["day"]) => (name ? DAYS.indexOf(name) : -1);
  const find = (edit: PlanEdit) => {
    const open = sessions.filter((session) => !logged.has(session.id));
    const named = `${edit.activity ?? ""} ${said}`.toLowerCase();
    // Best match is the session with the most title words in the request: "long run" beats "easy run".
    const score = (session: PlanSession) => (session.title.toLowerCase().match(/[a-z]{3,}/g) ?? [])
      .filter((word) => named.includes(stem(word))).length;
    const best = [...open].sort((a, b) => score(b) - score(a))[0];
    return open.find((session) => session.dayIndex === index(edit.day)) ?? (best && score(best) > 0 ? best : undefined);
  };
  // shortcut: one session per day, so a requested day that is taken gets the nearest free day; upgrade if days ever hold two sessions.
  const freeDay = (want: number) => {
    const taken = new Set(sessions.map((session) => session.dayIndex));
    const free = [0, 1, 2, 3, 4, 5, 6].filter((d) => !taken.has(d));
    if (want >= 0) return free.sort((a, b) => Math.abs(a - want) - Math.abs(b - want) || b - a)[0];
    return free.find((d) => d > today) ?? free[free.length - 1];
  };

  for (const edit of edits) {
    const target = find(edit);
    const to = index(edit.toDay);
    if (edit.op === "add") {
      const name = edit.newActivity ?? edit.activity;
      const want = to >= 0 ? to : index(edit.day);
      const dayIndex = freeDay(want);
      if (!name?.trim() || dayIndex === undefined) return null;
      const inTheWay = sessions.find((session) => session.dayIndex === want);
      if (inTheWay) notes.push(`${DAY_LABELS[want]} already has ${inTheWay.title}, so ${titled(name)} went on ${DAY_LABELS[dayIndex]}.`);
      sessions.push(withMinutes({
        id: createId(), dayIndex, title: titled(name), rationale: "Added because you asked for it.",
        intensity: edit.intensity ?? "easy", steps: [],
      }, edit.minutes ?? 30));
    } else if (edit.op === "harder" || edit.op === "easier") {
      const one = edit.day || edit.activity ? target : undefined; // otherwise the whole week
      if ((edit.day || edit.activity) && !one) return null;
      const shift = edit.op === "harder" ? 1 : -1;
      sessions = sessions.map((session) =>
        (one ? session.id === one.id : !logged.has(session.id)) ? shiftSessionEffort(session, shift) : session);
    } else if (!target) {
      return null;
    } else if (edit.op === "remove") {
      sessions = sessions.filter((session) => session.id !== target.id);
    } else if (edit.op === "move") {
      if (to < 0) return null;
      const other = sessions.find((session) => session.dayIndex === to && session.id !== target.id);
      if (other && logged.has(other.id)) return null;
      if (other) other.dayIndex = target.dayIndex; // a taken day means the two sessions trade places
      target.dayIndex = to;
    } else if (edit.op === "replace" || edit.op === "set") {
      const renamed = edit.op === "replace";
      if (renamed && !edit.newActivity?.trim()) return null;
      if (!renamed && !edit.minutes && !edit.intensity) return null;
      if (renamed) Object.assign(target, { title: titled(edit.newActivity!), rationale: "Swapped in because you asked for it." });
      if (edit.intensity) target.intensity = edit.intensity;
      if (renamed || edit.minutes) Object.assign(target, withMinutes(renamed ? { ...target, steps: [] } : target, edit.minutes ?? (minutesOf(target) || 30)));
    } else {
      return null;
    }
  }
  return { ...plan, sessions: sessions.sort((a, b) => a.dayIndex - b.dayIndex) };
}

/** What changed, in words short enough for the coach to repeat exactly. */
export function summarizePlanEdits(previous: TrainingPlan | null, edited: TrainingPlan, edits: PlanEdit[], notes: string[] = []): string[] {
  const [only] = edits;
  if (edits.length === 1 && (only.op === "harder" || only.op === "easier") && !only.day && !only.activity) {
    return [`Every remaining session this week is now a step ${only.op}.`];
  }
  // Edits keep session ids, so compare by id: a move reads as a move, not a removal plus an addition.
  const before = new Map(previous?.sessions.map((session) => [session.id, session]));
  const lines = edited.sessions.flatMap((after) => {
    const was = before.get(after.id);
    before.delete(after.id);
    const day = DAY_LABELS[after.dayIndex];
    if (!was) return [`Added ${after.title} on ${day}.`];
    const out: string[] = [];
    if (was.title !== after.title) out.push(`Changed ${day} from ${was.title} to ${after.title}.`);
    if (was.dayIndex !== after.dayIndex) out.push(`Moved ${after.title} from ${DAY_LABELS[was.dayIndex]} to ${day}.`);
    const parts = [
      minutesOf(was) !== minutesOf(after) ? `${minutesOf(after)} minutes` : "",
      was.intensity !== after.intensity ? after.intensity : "",
    ].filter(Boolean);
    if (was.title === after.title && parts.length) out.push(`${after.title} on ${day} is now ${parts.join(" and ")}.`);
    return out;
  });
  const removed = [...before.values()].map((session) => `Removed ${session.title} from ${DAY_LABELS[session.dayIndex]}.`);
  const all = [...lines, ...removed, ...notes];
  return all.length > 0 ? all : describePlanChanges(previous, edited);
}

/**
 * Reads the common phrasings without a model: used in demo mode and when the model call fails.
 * shortcut: fixed phrasings only, so anything it misses returns no edits and the caller falls back.
 */
export function parsePlanEdits(text: string): PlanEdit[] {
  const said = text.toLowerCase().replace(/[’]/g, "'").replace(/[.!?]+$/, "").trim();
  const days = [...said.matchAll(new RegExp(`\\b(${DAYS.join("|")})\\b`, "g"))].map((match) => match[1] as (typeof DAYS)[number]);
  const minutes = Number(said.match(/\b(\d{1,3})\s*(?:minutes?|mins?)\b/)?.[1]) || null;
  const activity = (raw: string) => raw.replace(/\b(?:my|the|an?|some|another|on|this week|session|workout|day|class)\b/g, " ")
    .replace(new RegExp(`\\b(?:${DAYS.join("|")})(?:'s)?`, "g"), " ").replace(/\d+\s*(?:minutes?|mins?)(?:\s+of)?/g, " ").replace(/\s+/g, " ").trim();

  const swap = said.match(/\b(?:swap|replace|switch|change)\s+(.+?)\s+(?:for|with|to|into)\s+(.+)$/);
  const instead = said.match(/\b(.+?)\s+instead of\s+(.+)$/);
  const from = swap ? swap[1] : instead?.[2];
  const into = swap ? swap[2] : instead?.[1].replace(/^.*\b(?:do|want|have|like|rather|prefer)\b/, "");
  if (from && into && !new RegExp(`^(?:${DAYS.join("|")})$`).test(activity(into) || into.trim())) {
    if (/\brest\b/.test(into)) return [{ op: "remove", day: days[0], activity: activity(from) }];
    if (activity(into)) return [{ op: "replace", day: days[0], activity: activity(from), newActivity: activity(into), minutes }];
  }
  if (/\b(?:move|reschedule|shift|swap|switch|change)\b/.test(said) && days.length > 0 && /\b(?:to|and|with|for)\b/.test(said)) {
    return [{ op: "move", day: days.length > 1 ? days[0] : null, toDay: days[days.length - 1] }];
  }
  const add = said.match(/\badd\s+(.+?)(?:\s+(?:to|into|in)\s+(?:my|the)\b.*)?$/);
  const added = add ? activity(add[1]) : "";
  if (added && added.split(" ").length <= 3 && !/^(?:that|to|up|it|rest)\b/.test(added)) {
    return [{ op: "add", newActivity: added, toDay: days[0], minutes }];
  }
  if (/\b(?:remove|drop|delete|cancel|take out|get rid of)\b/.test(said)) return [{ op: "remove", day: days[0] }];
  if (minutes && /\b(?:make|set|shorten|cut|reduce|extend|lengthen|change|keep)\b/.test(said)) return [{ op: "set", day: days[0], minutes }];
  if (/\b(?:make|want|need|give|can (?:you|we|i)|let's|please|too easy|too hard|too much|step it up)\b/.test(said)) {
    if (/\b(?:harder|tougher|more intense|more challenging|step it up|too easy)\b/.test(said)) return [{ op: "harder", day: days[0] }];
    if (/\b(?:easier|lighter|gentler|less intense|too hard|too much)\b/.test(said)) return [{ op: "easier", day: days[0] }];
  }
  return [];
}
