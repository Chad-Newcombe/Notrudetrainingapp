"use client";

import Link from "next/link";
import type { PlanTransition } from "@/lib/coach/plan-revision";

type Props = {
  state: "updating" | "saved" | "error" | "undoing";
  transition: PlanTransition | null;
  onRetry: () => void;
  onUndo: () => void;
};

export function PlanUpdateStatus({ state, transition, onRetry, onUndo }: Props) {
  if (state === "updating") {
    return <p className="panel px-4 py-3 text-sm text-[var(--muted)]" aria-live="polite">Updating your plan…</p>;
  }

  if (state === "error") {
    return (
      <div className="panel flex items-center justify-between gap-3 px-4 py-3 text-sm" role="alert">
        <p className="text-[var(--muted)]">Your plan wasn&apos;t changed.</p>
        <button type="button" onClick={onRetry} className="font-semibold text-[var(--ink)] underline-offset-4 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (!transition) return null;

  return (
    <section className="panel space-y-2 px-4 py-3" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-[var(--ink)]">{state === "undoing" ? "Restoring your plan…" : "Plan updated"}</p>
        <Link href="/plan" className="text-sm font-semibold text-[var(--ink)] underline-offset-4 hover:underline">See plan</Link>
      </div>
      <ul className="space-y-1 text-sm text-[var(--muted)]">
        {transition.changes.map((change) => <li key={change}>{change}</li>)}
      </ul>
      {transition.previous ? (
        <button type="button" onClick={onUndo} disabled={state === "undoing"}
          className="text-sm font-semibold text-[var(--ink)] underline-offset-4 hover:underline disabled:opacity-50">
          Undo
        </button>
      ) : null}
    </section>
  );
}
