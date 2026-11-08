"use client";

import Link from "next/link";
import { WeekPlan } from "@/components/plan/WeekPlan";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";

export default function PlanPage() {
  const { ready, plan } = useNotrudeStore();

  if (!ready) {
    return (
      <main className="flex min-h-[50dvh] items-center justify-center px-6">
        <p className="text-[var(--muted)]">Loading your plan…</p>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg text-[var(--ink)]">Your week plan isn&apos;t ready yet.</p>
        <p className="max-w-[32ch] text-[var(--muted)]">
          Finish acknowledgment to generate a week that fits your goal.
        </p>
        <Link
          href="/acknowledgment"
          className="text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Build my first week
        </Link>
      </main>
    );
  }

  return (
    <main className="px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <WeekPlan plan={plan} />
    </main>
  );
}
