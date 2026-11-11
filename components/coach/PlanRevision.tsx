"use client";

import Link from "next/link";
import { useState } from "react";
import { DAY_LABELS } from "@/lib/dates";
import { savePlan } from "@/lib/store";
import type { PlanConversationTurn } from "@/lib/coach/plan-revision";
import type { TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type Props = {
  profile: UserProfile;
  plan: TrainingPlan | null;
  logs: WorkoutLog[];
  conversation: PlanConversationTurn[];
  onSaved: (plan: TrainingPlan) => void;
};

export function PlanRevision({ profile, plan, logs, conversation, onSaved }: Props) {
  const [draft, setDraft] = useState<TrainingPlan | null>(null);
  const [source, setSource] = useState<"model" | "fixture">("model");
  const [busy, setBusy] = useState<"drafting" | "saving" | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function buildDraft() {
    setBusy("drafting");
    setError("");
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, currentPlan: plan, logs, conversation }),
      });
      if (!response.ok) throw new Error("Plan request failed");
      const data = (await response.json()) as { plan?: TrainingPlan; source?: "model" | "fixture" };
      if (!data.plan || !Array.isArray(data.plan.sessions)) throw new Error("Invalid plan");
      setDraft(data.plan);
      setSource(data.source === "fixture" ? "fixture" : "model");
      setSaved(false);
    } catch {
      setError("Couldn’t draft a new week. Check that Ollama is running, then try again.");
    } finally {
      setBusy(null);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    setBusy("saving");
    setError("");
    try {
      await savePlan(draft);
      onSaved(draft);
      setDraft(null);
      setSaved(true);
    } catch {
      setError("Couldn’t save the revised plan. Your current plan is still here.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={draft ? "panel space-y-3 p-4" : "space-y-2"} aria-label="Revise your week">
      {!draft && !saved && (
        <button type="button" onClick={() => void buildDraft()} disabled={busy !== null}
          className="rounded-[var(--radius-pill)] border border-[var(--line)] bg-[var(--canvas-light)] px-4 py-2 text-sm font-semibold text-[var(--ink)] disabled:opacity-50">
          {busy === "drafting" ? "Drafting your week…" : "Revise week from this chat"}
        </button>
      )}

      {draft && (
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold text-[var(--ink)]">Revised week draft</h2>
          <p className="text-sm text-[var(--muted)]">
            {source === "fixture" ? "Basic offline draft. Check that it reflects your conversation." : "Review this draft before replacing your saved week."}
            {logs.length > 0 ? " Logged sessions stay in place." : ""}
          </p>
          <ul className="space-y-2">
            {[...draft.sessions].sort((a, b) => a.dayIndex - b.dayIndex).map((session) => (
              <li key={session.id} className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--canvas-light)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{DAY_LABELS[session.dayIndex]} · {session.intensity}</p>
                <p className="mt-1 font-semibold text-[var(--ink)]">{session.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{session.rationale}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{session.steps.map((step) => `${step.name}${step.durationMin ? ` · ${step.durationMin} min` : ""}`).join(" · ")}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveDraft()} disabled={busy !== null}
              className="rounded-[var(--radius-pill)] bg-[var(--voltage)] px-4 py-2 text-sm font-semibold text-[var(--on-voltage)] disabled:opacity-50">
              {busy === "saving" ? "Saving…" : "Save revised plan"}
            </button>
            <button type="button" onClick={() => setDraft(null)} disabled={busy !== null}
              className="rounded-[var(--radius-pill)] border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink)] disabled:opacity-50">
              Keep current plan
            </button>
          </div>
        </div>
      )}

      {saved && <p className="text-sm text-[var(--ink)]">Revised plan saved. <Link href="/plan" className="font-semibold underline">See your week</Link></p>}
      {error && <p role="alert" className="text-sm text-[var(--muted)]">{error}</p>}
    </section>
  );
}
