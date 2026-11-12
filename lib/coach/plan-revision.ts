import type { TrainingPlan, WorkoutLog } from "@/lib/types";
import { DAY_LABELS } from "@/lib/dates";

export type PlanConversationTurn = { role: "user" | "assistant"; content: string };
export type PlanIntent = "explicit" | "discussion";
export type PlanTransition = {
  previous: TrainingPlan | null;
  current: TrainingPlan;
  changes: string[];
};

export function classifyPlanIntent(text: string): PlanIntent {
  const value = text.toLowerCase().replace(/[’]/g, "'").trim();
  const day = /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|weekend)\b/;
  const number = "(?:one|two|three|four|five|six|seven|ten|fifteen|twenty|thirty|forty(?:-five)?|forty five|sixty)";
  const duration = new RegExp(`\\b(?:(?:\\d{1,3}|${number})\\s*(?:minutes?|mins?|hours?|hrs?)|shorter|longer)\\b`);
  const planContext = /\b(?:plan|week|schedule|sessions?|workouts?|training|recovery|rest day|run|running|walk|walking|swim|swimming|ride|riding|strength|mobility)\b/;
  const intensity = /\b(?:easier|harder|lighter|gentler|easy|moderate|hard|intensity)\b/;
  const sessionCount = new RegExp(`\\b(?:fewer|more|\\d+|${number})\\s+(?:sessions?|workouts?|days?)\\b`);
  const replacement = /\bfrom\b.+\bto\b|\bwith\b|\binstead of\b/;
  const action = /\b(?:make|move|reschedule|replace|swap|add|remove|drop|skip|shorten|cut|reduce|increase|change|update|adjust|set|switch|give)\b/;
  const concrete = day.test(value) || duration.test(value) || intensity.test(value)
    || sessionCount.test(value) || replacement.test(value) || /\brest day\b/.test(value);
  const contextual = planContext.test(value) || duration.test(value)
    || intensity.test(value) || sessionCount.test(value);
  const explicitConstraint = /\b(?:i\s+(?:can|have)\s+only|i\s+only\s+(?:can|have))\b/.test(value)
    && duration.test(value) && contextual;
  const unavailable = /\b(?:i\s+)?(?:can(?:no|')t|cannot|won't|unavailable)\b/.test(value)
    && day.test(value) && /\b(?:train|workout|run|walk|ride|swim|make it)\b/.test(value);
  const directExclusion = /\bno\s+(?:running|walking|riding|swimming|strength|workouts?|training)\b/.test(value)
    && /\b(?:this\s+week|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(value);
  const statedNeed = /\bi\s+(?:need|want|prefer)\b|\bi(?:'d| would)\s+(?:like|rather|prefer)\b/.test(value) && contextual && concrete;

  return (explicitConstraint || unavailable || directExclusion || statedNeed
    || (action.test(value) && contextual && concrete))
    ? "explicit"
    : "discussion";
}

export function describePlanChanges(
  previous: TrainingPlan | null,
  current: TrainingPlan,
): string[] {
  const changes: string[] = [];
  const beforeByDay = new Map(previous?.sessions.map((session) => [session.dayIndex, session]));
  const afterByDay = new Map(current.sessions.map((session) => [session.dayIndex, session]));

  for (let dayIndex = 0; dayIndex < DAY_LABELS.length; dayIndex += 1) {
    const before = beforeByDay.get(dayIndex);
    const after = afterByDay.get(dayIndex);
    const day = DAY_LABELS[dayIndex];
    if (before && !after) changes.push(`Removed ${before.title} from ${day}.`);
    if (!before && after) changes.push(`Added ${after.title} on ${day}.`);
    if (before && after && (
      before.title !== after.title
      || before.intensity !== after.intensity
      || JSON.stringify(before.steps) !== JSON.stringify(after.steps)
    )) {
      const beforeMinutes = before.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0);
      const afterMinutes = after.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0);
      if (before.title !== after.title) {
        changes.push(`Changed ${day} from ${before.title} to ${after.title}.`);
      } else if (beforeMinutes !== afterMinutes && afterMinutes > 0) {
        changes.push(`Changed ${day} to ${afterMinutes} minutes.`);
      } else if (before.intensity !== after.intensity) {
        changes.push(`Changed ${day} to ${after.intensity} intensity.`);
      } else {
        changes.push(`Updated ${before.title} on ${day}.`);
      }
    }
  }

  return changes.length > 0 ? changes : ["Updated the details in your week."];
}

export function createPlanTransition(
  previous: TrainingPlan | null,
  current: TrainingPlan,
): PlanTransition {
  return { previous, current, changes: describePlanChanges(previous, current) };
}

export async function persistPlanTransition(
  previous: TrainingPlan | null,
  current: TrainingPlan,
  save: (plan: TrainingPlan) => Promise<void>,
): Promise<PlanTransition> {
  await save(current);
  return createPlanTransition(previous, current);
}

export function undoPlanTransition(transition: PlanTransition): TrainingPlan | null {
  return transition.previous;
}

export function conversationForPlan(
  turns: PlanConversationTurn[],
  limit = 12,
): PlanConversationTurn[] {
  return turns
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && turn.content.trim())
    .slice(-limit)
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, 500) }));
}

export function preserveLoggedSessions(
  proposed: TrainingPlan,
  current: TrainingPlan | null,
  logs: WorkoutLog[],
): TrainingPlan {
  if (!current || current.weekStartIso !== proposed.weekStartIso) return proposed;
  const loggedIds = new Set(logs.map((log) => log.sessionId));
  const kept = current.sessions.filter((session) => loggedIds.has(session.id));
  if (kept.length === 0) return proposed;
  const loggedDays = new Set(kept.map((session) => session.dayIndex));
  return {
    ...proposed,
    weekStartIso: current.weekStartIso,
    sessions: [...kept, ...proposed.sessions.filter((session) => !loggedDays.has(session.dayIndex))]
      .sort((a, b) => a.dayIndex - b.dayIndex),
  };
}

export function adjustFixturePlanForConversation(
  plan: TrainingPlan,
  conversation: PlanConversationTurn[],
): TrainingPlan {
  const latestTime = [...conversation].reverse()
    .filter((turn) => turn.role === "user")
    .map((turn) => turn.content.match(/\b(\d{1,3})\s*(?:minutes?|mins?)\b/i))
    .find(Boolean);
  const minutes = latestTime ? Number(latestTime[1]) : null;
  if (!minutes) {
    // Demo mode has no model to rewrite the week, so scale it for "harder"/"easier" requests.
    const latest = [...conversation].reverse().find((turn) => turn.role === "user")?.content.toLowerCase() ?? "";
    const shift = /\b(?:harder|tougher|more intense|more challenging|step it up)\b/.test(latest) ? 1
      : /\b(?:easier|lighter|gentler|less intense)\b/.test(latest) ? -1 : 0;
    if (!shift) return plan;
    const levels = ["easy", "moderate", "hard"] as const;
    return {
      ...plan,
      sessions: plan.sessions.map((session) => ({
        ...session,
        intensity: levels[Math.min(2, Math.max(0, levels.indexOf(session.intensity) + shift))],
        rationale: shift > 0 ? "Stepped up because you asked for a harder week." : "Eased off because you asked for a lighter week.",
        steps: session.steps.map((step) => step.durationMin
          ? { ...step, durationMin: Math.max(5, Math.round(step.durationMin * (shift > 0 ? 1.25 : 0.8) / 5) * 5) }
          : step),
      })),
    };
  }
  if (minutes < 5 || minutes > 180) return plan;

  return {
    ...plan,
    sessions: plan.sessions.map((session) => {
      const total = session.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0);
      if (total <= minutes) return session;
      const first = session.steps[0];
      return {
        ...session,
        intensity: "easy" as const,
        rationale: `Shortened to fit the ${minutes} minutes you have.`,
        steps: [{
          name: first?.name ?? "Easy movement",
          detail: `Keep this easy for up to ${minutes} minutes.`,
          durationMin: minutes,
        }],
      };
    }),
  };
}

export function enforceLatestTimeConstraint(
  proposed: TrainingPlan,
  current: TrainingPlan | null,
  conversation: PlanConversationTurn[],
): TrainingPlan {
  const latest = [...conversation].reverse().find((turn) => turn.role === "user")?.content ?? "";
  const normalized = latest.toLowerCase().replace(/[’]/g, "'").trim();
  const dayPattern = "(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)";
  const minutePattern = "(?:\\d{1,3}|five|ten|fifteen|twenty|thirty|forty(?:-five)?|forty five|sixty)\\s*(?:minutes?|mins?)";
  const durationOnly = [
    new RegExp(`^(?:please\\s+)?(?:make|set|shorten|cut|reduce|adjust)\\s+(?:the\\s+)?${dayPattern}(?:'s)?(?:\\s+(?:session|workout|training))?\\s+(?:to\\s+|at\\s+)?${minutePattern}[.!]?$`, "i"),
    new RegExp(`^i\\s+(?:(?:can|have)\\s+only|only\\s+(?:can|have))\\s+(?:do\\s+|train\\s+for\\s+)?${minutePattern}\\s+(?:on\\s+)?${dayPattern}[.!]?$`, "i"),
  ].some((pattern) => pattern.test(normalized));
  if (!durationOnly) return proposed;

  const timeMatch = latest.match(/\b(\d{1,3}|five|ten|fifteen|twenty|thirty|forty(?:-five)?|forty five|sixty)\s*(?:minutes?|mins?)\b/i);
  const namedDays = DAY_LABELS
    .map((day, index) => ({ index, present: new RegExp(`\\b${day}\\b`, "i").test(latest) }))
    .filter(({ present }) => present);
  if (namedDays.length !== 1) return proposed;
  const dayIndex = namedDays[0].index;
  const minuteWords: Record<string, number> = {
    five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30,
    forty: 40, "forty-five": 45, "forty five": 45, sixty: 60,
  };
  const rawMinutes = timeMatch?.[1]?.toLowerCase();
  const minutes = rawMinutes ? (minuteWords[rawMinutes] ?? Number(rawMinutes)) : 0;
  if (dayIndex < 0 || minutes < 5 || minutes > 180) return proposed;

  const totalMinutes = (session: TrainingPlan["sessions"][number]) =>
    session.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0);
  const exactCandidates = proposed.sessions.filter((session) => totalMinutes(session) === minutes);
  const proposedOnDay = proposed.sessions.find((session) => session.dayIndex === dayIndex);
  const currentOnDay = current?.sessions.find((session) => session.dayIndex === dayIndex);
  const source = currentOnDay
    ?? (exactCandidates.length === 1 ? exactCandidates[0] : undefined)
    ?? proposedOnDay;
  if (!source) return proposed;

  const adjusted = {
    ...source,
    dayIndex,
    intensity: "easy" as const,
    rationale: `Adjusted to the ${minutes} minutes requested for ${DAY_LABELS[dayIndex]}.`,
    steps: [{
      name: source.steps[0]?.name ?? source.title,
      detail: `Keep this easy for ${minutes} minutes.`,
      durationMin: minutes,
    }],
  };
  if (current) {
    return {
      ...proposed,
      weekStartIso: current.weekStartIso,
      sessions: [
        ...current.sessions.filter((session) => session.dayIndex !== dayIndex),
        adjusted,
      ].sort((a, b) => a.dayIndex - b.dayIndex),
    };
  }

  const sourceWasProposed = proposed.sessions.some((session) => session.id === source.id);
  return {
    ...proposed,
    sessions: [
      ...proposed.sessions.filter((session) =>
        session.dayIndex !== dayIndex && (!sourceWasProposed || session.id !== source.id)),
      adjusted,
    ].sort((a, b) => a.dayIndex - b.dayIndex),
  };
}

export function limitRevisionSessions(
  plan: TrainingPlan,
  conversation: PlanConversationTurn[],
  logs: WorkoutLog[],
  maxSessions = 4,
): TrainingPlan {
  if (plan.sessions.length <= maxSessions) return plan;
  const loggedIds = new Set(logs.map((log) => log.sessionId));
  const requestedDays = new Set<number>();
  const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const userText = conversation.filter((turn) => turn.role === "user")
    .map((turn) => turn.content.toLowerCase()).join(" ");
  dayNames.forEach((day, index) => {
    if (new RegExp(`\\b${day}\\b`).test(userText)) requestedDays.add(index);
  });

  const logged = plan.sessions.filter((session) => loggedIds.has(session.id));
  const unlogged = plan.sessions.filter((session) => !loggedIds.has(session.id));
  const requested = unlogged.filter((session) => requestedDays.has(session.dayIndex));
  const other = unlogged.filter((session) => !requestedDays.has(session.dayIndex));
  const keepCount = Math.max(maxSessions, logged.length);
  return {
    ...plan,
    sessions: [...logged, ...requested, ...other]
      .slice(0, keepCount)
      .sort((a, b) => a.dayIndex - b.dayIndex),
  };
}
