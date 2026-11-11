"use client";

import { useEffect, useState } from "react";
import { COACH_PRESETS } from "@/lib/coaches/presets";
import { profileWithCoach } from "@/lib/coaches/switch";
import { saveProfile } from "@/lib/store";
import type { CoachId, UserProfile } from "@/lib/types";

type Props = {
  profile: UserProfile;
  onChanged?: (profile: UserProfile) => void;
};

export function CoachSwitcher({ profile, onChanged }: Props) {
  const [current, setCurrent] = useState(profile);
  const [saving, setSaving] = useState<CoachId | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setCurrent(profile), [profile]);

  async function choose(coachId: CoachId) {
    const next = profileWithCoach(current, coachId);
    if (next === current) return;
    setSaving(coachId);
    setError("");
    try {
      await saveProfile(next);
      setCurrent(next);
      onChanged?.(next);
    } catch {
      setError("Couldn’t change coaches. Your current coach is still selected.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <details className="panel group px-4 py-3">
      <summary className="cursor-pointer list-none font-semibold text-[var(--ink)]">
        Change coach
        <span className="ml-2 text-sm font-normal text-[var(--muted)]">
          {COACH_PRESETS.find((coach) => coach.id === current.coachId)?.name}
        </span>
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {COACH_PRESETS.map((coach) => {
          const selected = coach.id === current.coachId;
          return (
            <button key={coach.id} type="button" disabled={saving !== null}
              onClick={() => void choose(coach.id)}
              aria-pressed={selected}
              className={`rounded-[var(--radius-panel)] border p-3 text-left disabled:opacity-60 ${selected ? "border-[var(--ink-strong)] bg-[var(--canvas-soft)]" : "border-[var(--line)] bg-[var(--canvas-light)]"}`}>
              <span className="block font-semibold text-[var(--ink)]">{coach.name}</span>
              <span className="mt-1 block text-sm text-[var(--muted)]">{coach.vibe}</span>
              {selected ? <span className="mt-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Current coach</span> : null}
            </button>
          );
        })}
      </div>
      {saving ? <p className="mt-2 text-sm text-[var(--muted)]">Changing coach…</p> : null}
      {error ? <p className="mt-2 text-sm text-[var(--muted)]" role="alert">{error}</p> : null}
    </details>
  );
}
