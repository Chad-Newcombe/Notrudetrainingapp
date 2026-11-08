"use client";

import { WeekPlan } from "@/components/plan/WeekPlan";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function PlanPage() {
  const { plan } = useNotrudeStore();
  if (!plan) return null;

  return (
    <main className="px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <WeekPlan plan={plan} />
    </main>
  );
}
