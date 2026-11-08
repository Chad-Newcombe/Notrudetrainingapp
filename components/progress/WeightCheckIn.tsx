"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createId } from "@/lib/ids";
import { addProgress } from "@/lib/store";
import type { ProgressSnapshot } from "@/lib/types";

type Props = {
  snapshots: ProgressSnapshot[];
  onSaved: () => void;
};

export function WeightCheckIn({ snapshots, onSaved }: Props) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const recentWeights = snapshots
    .filter((s) => s.type === "weight" && s.value != null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  async function save() {
    const lbs = Number.parseFloat(value);
    if (!Number.isFinite(lbs) || lbs <= 0 || saving) return;
    setSaving(true);
    try {
      await addProgress({
        id: createId(),
        type: "weight",
        value: lbs,
        createdAt: new Date().toISOString(),
      });
      setValue("");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
        Weight check-in
      </h2>
      <p className="text-base text-[var(--muted)]">
        Optional — log only when it helps you, not because you owe anyone a
        number.
      </p>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--ink)]">Today (lbs)</span>
        <input
          type="number"
          inputMode="decimal"
          min={1}
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-[var(--ink)] ring-1 ring-white/10 placeholder:text-[var(--muted)] focus:outline focus:outline-2 focus:outline-[var(--accent)]"
          placeholder="e.g. 210"
        />
      </label>
      <Button
        className="w-full"
        variant="ghost"
        disabled={saving || !value.trim()}
        onClick={() => void save()}
      >
        {saving ? "Saving…" : "Save check-in"}
      </Button>
      {recentWeights.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-1 text-sm text-[var(--muted)]">
          {recentWeights.map((w) => (
            <li key={w.id}>
              {w.value} lbs —{" "}
              {new Date(w.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
