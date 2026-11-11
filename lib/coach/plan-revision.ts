import type { TrainingPlan, WorkoutLog } from "@/lib/types";

export type PlanConversationTurn = { role: "user" | "assistant"; content: string };

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
  if (!minutes || minutes < 5 || minutes > 180) return plan;

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
