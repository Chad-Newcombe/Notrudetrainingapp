"use client";

import { useState } from "react";
import { BentoHome } from "@/components/today/BentoHome";
import { trainingSummary } from "@/lib/coach/insight";
import { useCoachNote } from "@/lib/hooks/useCoachNote";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";
import { savePlan } from "@/lib/store";
import type { TrainingPlan } from "@/lib/types";

export default function TodayPage() {
  const { profile, plan, logs, history, reload } = useNotrudeStore();
  const [planning, setPlanning] = useState<"idle" | "busy" | "error">("idle");
  const input = profile ? { profile, plan, history, logs } : null;
  const note = useCoachNote("daily", input);
  const weekly = useCoachNote("weekly", input);

  if (!profile || !plan) return null;

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
    <BentoHome
      profile={profile}
      plan={plan}
      history={history}
      logs={logs}
      dailyNote={note}
      weeklyNote={weekly}
      onPlanNewWeek={() => void planNewWeek()}
      planning={planning}
      onCoachClosed={() => void reload()}
    />
  );
}
