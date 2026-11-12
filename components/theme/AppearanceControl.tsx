"use client";

import { useEffect, useState } from "react";
import { saveProfile } from "@/lib/store";
import type { AppearanceMode, UserProfile } from "@/lib/types";

const choices: Array<{ value: AppearanceMode; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function AppearanceControl({
  profile,
  onChanged,
}: {
  profile: UserProfile;
  onChanged?: (profile: UserProfile) => void;
}) {
  const [current, setCurrent] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setCurrent(profile), [profile]);

  async function choose(appearance: AppearanceMode) {
    if ((current.appearance ?? "system") === appearance || saving) return;
    const previous = current;
    const next = { ...current, appearance };
    setCurrent(next);
    setSaving(true);
    setError("");
    try {
      await saveProfile(next);
      onChanged?.(next);
    } catch {
      setCurrent(previous);
      setError("Couldn’t change the appearance. Your previous setting is still active.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" className="text-base font-semibold text-[var(--app-text)]">Appearance</h2>
      <p className="mt-1 text-sm text-[var(--app-muted)]">Use your device setting or choose a mode for Not Rude Training.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {choices.map((choice) => {
          const selected = (current.appearance ?? "system") === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              aria-pressed={selected}
              disabled={saving}
              onClick={() => void choose(choice.value)}
              className={`min-h-11 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--app-focus)] disabled:opacity-60 ${
                selected
                  ? "border-[var(--app-accent)] bg-[var(--app-accent)] text-[var(--app-on-accent)]"
                  : "border-[var(--app-line)] bg-[var(--app-raised)] text-[var(--app-text)]"
              }`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-[var(--app-muted)]">{error}</p> : null}
    </section>
  );
}
