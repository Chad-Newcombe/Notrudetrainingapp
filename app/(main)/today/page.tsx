"use client";

import { TodaySession } from "@/components/today/TodaySession";
import { dayIndexInPlanWeek } from "@/lib/dates";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function TodayPage() {
  const { profile, plan, logs } = useNotrudeStore();

  if (!profile || !plan) return null;

  const dayIndex = dayIndexInPlanWeek(plan.weekStartIso);
  const session =
    dayIndex == null
      ? null
      : (plan.sessions.find((s) => s.dayIndex === dayIndex) ?? null);

  const loggedToday =
    session != null &&
    logs.some(
      (l) =>
        l.sessionId === session.id &&
        (l.status === "completed" || l.status === "partial"),
    );

  return (
    <main className="bg-[var(--canvas-soft)] px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <TodaySession
        session={session}
        plan={plan}
        logs={logs}
        profile={profile}
        loggedToday={loggedToday}
        outsidePlanWeek={dayIndex == null}
      />
    </main>
  );
}
