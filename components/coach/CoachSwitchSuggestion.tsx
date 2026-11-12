"use client";
import { useRef, useState } from "react";
import { getCoach } from "@/lib/coaches/presets";
import type { CoachFitSuggestion } from "@/lib/coaches/fit";
import { profileWithCoach } from "@/lib/coaches/switch";
import { archiveCoachConversation, getProfile, saveProfile } from "@/lib/store";
import { storageScope } from "@/lib/store/storage";
import { storageGeneration } from "@/lib/store/db";
import type { UserProfile } from "@/lib/types";

export function CoachSwitchSuggestion({ suggestion, profile, conversationId, onStay, onSwitched, disabled = false }: {
  suggestion: CoachFitSuggestion; profile: UserProfile; conversationId: string;
  disabled?: boolean; onStay: () => Promise<void>; onSwitched: () => void;
}) {
  const scope = useRef(storageScope());
  const generation = useRef(storageGeneration());
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function choose(switchCoach: boolean) {
    if (working.current || disabled) return;
    working.current = true; setBusy(true); setError("");
    try {
      if (switchCoach) {
        await archiveCoachConversation(conversationId);
        if (scope.current !== storageScope() || generation.current !== storageGeneration()) throw new Error("Storage changed");
        const current = await getProfile();
        if (scope.current !== storageScope() || generation.current !== storageGeneration()) throw new Error("Storage changed");
        await saveProfile(profileWithCoach(current ?? profile, suggestion.coachId));
        onSwitched();
      } else await onStay();
    } catch { setError("Couldn’t save your choice. Please try again."); }
    finally { working.current = false; setBusy(false); }
  }
  return <section className="panel space-y-3 p-4" aria-label="Coach suggestion">
    <p className="text-sm text-[var(--app-text)]">{suggestion.reason}</p>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy || disabled} onClick={() => void choose(true)} className="min-h-11 rounded-[var(--radius-control)] bg-[var(--app-accent)] px-4 font-semibold text-[var(--app-on-accent)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)]">Switch to {getCoach(suggestion.coachId).name}</button>
      <button type="button" disabled={busy || disabled} onClick={() => void choose(false)} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--app-line)] px-4 text-[var(--app-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)]">Stay with {getCoach(profile.coachId).name}</button>
    </div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
