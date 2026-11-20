import { applyPlanEdits, summarizePlanEdits, type PlanEdit } from "@/lib/coach/plan-edit";
import { DAY_LABELS } from "@/lib/dates";
import type { PlanSession, SessionFeeling, TrainingPlan, WorkoutLog } from "@/lib/types";

export type InsightKind = "checkin" | "daily" | "weekly";
export type InsightProposal = { summary: string; edits: PlanEdit[] };
export type Insight = { message: string; proposal: InsightProposal | null };

const minutesOf = (session: PlanSession) => session.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0);

/** A compact, factual view of recent training for the coach model. Nothing here is invented. */
export function trainingSummary(plan: TrainingPlan | null, history: TrainingPlan[], logs: WorkoutLog[]) {
  const weeks = [...history, ...(plan ? [plan] : [])].slice(-4);
  const byId = new Map(weeks.flatMap((week) => week.sessions.map((session) => [session.id, { week, session }] as const)));
  const logFor = (id: string) => [...logs].reverse().find((log) => log.sessionId === id);
  return {
    weeks: weeks.map((week) => {
      const logged = week.sessions.map((session) => logFor(session.id)).filter((log): log is WorkoutLog => !!log);
      return {
        weekOf: week.weekStartIso.slice(0, 10),
        plannedSessions: week.sessions.length,
        plannedMinutes: week.sessions.reduce((sum, session) => sum + minutesOf(session), 0),
        done: logged.filter((log) => log.status !== "skipped").length,
        skipped: logged.filter((log) => log.status === "skipped").length,
        actualMinutes: logged.reduce((sum, log) => sum + (log.actualMinutes ?? 0), 0),
        felt: logged.flatMap((log) => (log.feeling ? [log.feeling] : [])),
      };
    }),
    recentCheckIns: logs.filter((log) => byId.has(log.sessionId)).slice(-6).map((log) => {
      const { session } = byId.get(log.sessionId)!;
      return {
        session: `${DAY_LABELS[session.dayIndex]} ${session.title}`,
        plannedMinutes: minutesOf(session),
        actualMinutes: log.actualMinutes ?? null,
        felt: log.feeling ?? null,
        status: log.status,
      };
    }),
  };
}

/** Sessions still ahead this week, which are the only ones a proposal may touch. */
export function upcomingSessions(plan: TrainingPlan | null, logs: WorkoutLog[], today: number): PlanSession[] {
  const logged = new Set(logs.map((log) => log.sessionId));
  return (plan?.sessions ?? []).filter((session) => session.dayIndex > today && !logged.has(session.id));
}

/**
 * Keeps a proposal only if code can apply it exactly, it touches upcoming sessions only,
 * and it never adds load after pain.
 */
export function safeProposal(
  plan: TrainingPlan | null,
  logs: WorkoutLog[],
  proposal: InsightProposal | null | undefined,
  feeling: SessionFeeling | undefined,
  today: number,
): InsightProposal | null {
  if (!plan || !proposal?.edits.length) return null;
  const easing = new Set(["easier", "remove", "set"]);
  if (feeling === "pain" && proposal.edits.some((edit) => !easing.has(edit.op) || (edit.op === "set" && edit.intensity === "hard"))) return null;
  if (proposal.edits.some((edit) => edit.op === "rewrite")) return null;
  const edited = applyPlanEdits(plan, proposal.edits, logs, "", today);
  if (!edited) return null;
  const ahead = new Set(upcomingSessions(plan, logs, today).map((session) => session.id));
  // Only what the user would notice counts as a change; a rewritten rationale alone does not.
  const shape = (session: PlanSession) => JSON.stringify([session.dayIndex, session.title, session.intensity, session.steps.map((step) => step.durationMin ?? null)]);
  const before = new Map(plan.sessions.map((session) => [session.id, shape(session)]));
  const touched = edited.sessions.filter((session) => before.get(session.id) !== shape(session));
  const removed = plan.sessions.filter((session) => !edited.sessions.some((next) => next.id === session.id));
  const fresh = touched.filter((session) => !before.has(session.id));
  if ([...touched, ...removed].some((session) => before.has(session.id) && !ahead.has(session.id))) return null;
  if (fresh.some((session) => session.dayIndex <= today)) return null;
  if (touched.length === 0 && removed.length === 0) return null; // a "change" that changes nothing
  // The summary comes from the change code will make, never from the model's description of it.
  return { summary: summarizePlanEdits(plan, edited, proposal.edits).join(" "), edits: proposal.edits };
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

/**
 * The change offered after a check-in, chosen by code so the card always matches what will be applied:
 * two easy sessions in a row step the next session up; hard or pain eases it back. The coach model
 * then explains it in its own voice.
 */
export function checkInProposal(plan: TrainingPlan | null, logs: WorkoutLog[], feeling: SessionFeeling | undefined, today: number): InsightProposal | null {
  const next = upcomingSessions(plan, logs, today)[0];
  if (!next || !feeling || feeling === "right") return null;
  const felt = logs.flatMap((log) => (log.feeling ? [log.feeling] : []));
  if (feeling === "easy" && felt.slice(-2).join() !== "easy,easy") return null;
  const day = DAYS[next.dayIndex];
  return safeProposal(plan, logs, { summary: "", edits: [{ op: feeling === "easy" ? "harder" : "easier", day }] }, feeling, today);
}
