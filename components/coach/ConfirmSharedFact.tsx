"use client";

import { useState } from "react";
import { createId } from "@/lib/ids";
import { getProfile, saveProfile } from "@/lib/store";
import type { SharedFactCandidate, UserProfile } from "@/lib/types";

const CATEGORIES = ["ability", "constraint", "schedule"];
const comparable = (text: string) => text.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

/** Appends one confirmed fact; returns the same profile for an invalid or already-confirmed candidate. */
export function promoteSharedFact(profile: UserProfile, candidate: SharedFactCandidate, now: string): UserProfile {
  const statement = candidate.statement.trim();
  const facts = profile.sharedFacts ?? [];
  if (!CATEGORIES.includes(candidate.category) || !statement || statement.length > 220) return profile;
  if (facts.some((fact) => fact.category === candidate.category && comparable(fact.statement) === comparable(statement))) return profile;
  return { ...profile, sharedFacts: [...facts, { id: createId(), category: candidate.category, statement, confirmedAt: now }] };
}

export function ConfirmSharedFact({ candidate, onDone }: { candidate: SharedFactCandidate; onDone?: () => void }) {
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  async function accept() {
    setState("busy");
    try {
      const profile = await getProfile();
      if (!profile) throw new Error("No profile");
      const next = promoteSharedFact(profile, candidate, new Date().toISOString());
      if (next !== profile) await saveProfile(next);
      setState("saved");
      onDone?.();
    } catch { setState("error"); }
  }
  if (state === "saved") return <p role="status" className="text-sm text-[var(--app-muted)]">Shared with all coaches.</p>;
  return (
    <div>
      <button type="button" disabled={state === "busy"} onClick={() => void accept()}
        className="min-h-11 text-left text-sm font-semibold underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)] disabled:opacity-60">
        Share “{candidate.statement.trim()}” with all coaches
      </button>
      {state === "error" ? <p role="alert" className="text-sm text-[var(--app-muted)]">Couldn’t save that. Try again.</p> : null}
    </div>
  );
}
