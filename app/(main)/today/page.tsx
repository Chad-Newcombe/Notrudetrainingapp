"use client";

import { useState } from "react";
import { TodaySession } from "@/components/today/TodaySession";
import { trainingSummary } from "@/lib/coach/insight";
import { dayIndexInPlanWeek } from "@/lib/dates";
import { useCoachNote } from "@/lib/hooks/useCoachNote";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";
import { savePlan } from "@/lib/store";
import type { TrainingPlan } from "@/lib/types";

export default function TodayPage() {
  const { profile, plan, logs, history, reload } = useNotrudeStore();
  const [planning, setPlanning] = useState<"idle" | "busy" | "error">("idle");
  const note = useCoachNote("daily", profile ? { profile, plan, history, logs } : null);

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

  // The new week is built from last week's plan and check-ins; saving it moves last week into history.
  async function planNewWeek() {
    if (!profile || !plan) return;
    setPlanning("busy");
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, newWeek: true, lastWeek: plan, training: trainingSummary(plan, history, logs) }),
      });
      if (!response.ok) throw new Error("Plan request failed");
      const data = (await response.json()) as { plan?: TrainingPlan };
      if (!data.plan?.sessions) throw new Error("Invalid plan");
      await savePlan(data.plan);
      await reload();
      setPlanning("idle");
    } catch {
      setPlanning("error");
    }
  }

  return (
    <main className="bg-[var(--canvas-soft)] px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <TodaySession
        session={session}
        plan={plan}
        logs={logs}
        profile={profile}
        loggedToday={loggedToday}
        outsidePlanWeek={dayIndex == null}
        note={note}
        onPlanNewWeek={() => void planNewWeek()}
        planningWeek={planning === "busy"}
      />
      {planning === "error" ? (
        <p role="alert" className="mt-4 text-sm text-[var(--app-muted)]">Couldn’t plan the week right now. Try again in a moment.</p>
      ) : null}
    </main>
  );
}
