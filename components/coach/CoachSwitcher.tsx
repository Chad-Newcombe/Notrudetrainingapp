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
      <summary className="min-h-11 cursor-pointer list-none py-2 font-semibold text-[var(--app-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)]">
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
              className={`coach-choice min-h-11 rounded-[var(--radius-control)] p-3 text-left focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)] disabled:opacity-60 ${selected ? "border-[var(--app-accent)] bg-[color-mix(in_srgb,var(--app-accent),var(--app-raised)_80%)]" : ""}`}>
              <span className="block font-semibold text-[var(--app-text)]">{coach.name}</span>
              <span className="mt-1 block text-sm text-[var(--app-muted)]">{coach.vibe}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--app-muted)]">{coach.communication}</span>
              {selected ? <span className="mt-2 block text-xs font-semibold text-[var(--app-accent)]">Current coach</span> : null}
            </button>
          );
        })}
      </div>
      {saving ? <p className="mt-2 text-sm text-[var(--muted)]">Changing coach…</p> : null}
      {error ? <p className="mt-2 text-sm text-[var(--muted)]" role="alert">{error}</p> : null}
    </details>
  );
}
