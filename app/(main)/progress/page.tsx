"use client";

import { useCallback, useEffect, useState } from "react";
import { HealthConnections } from "@/components/progress/HealthConnections";
import { HistoryList } from "@/components/progress/HistoryList";
import { StreakBadge } from "@/components/progress/StreakBadge";
import { MessageDrafts } from "@/components/progress/MessageDrafts";
import { WeightCheckIn } from "@/components/progress/WeightCheckIn";
import { Button } from "@/components/ui/Button";
import { useNotrudeStore } from "@/lib/hooks/useNotrudeStore";
import { createId } from "@/lib/ids";
import { computeStreak } from "@/lib/progress/streaks";
import { addProgress, listProgress } from "@/lib/store";
import type { ProgressSnapshot, UserProfile } from "@/lib/types";

export default function ProgressPage() {
  const { profile, plan, logs } = useNotrudeStore();
  const [snapshots, setSnapshots] = useState<ProgressSnapshot[]>([]);
  const [reflectionText, setReflectionText] = useState<string | null>(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);

  const reloadProgress = useCallback(async () => {
    const list = await listProgress();
    setSnapshots(list);
  }, []);

  useEffect(() => {
    void reloadProgress();
  }, [reloadProgress]);

  const streak = computeStreak(logs);

  const pastReflections = snapshots
    .filter((s) => s.type === "reflection")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  async function writeReflection(p: UserProfile) {
    setReflectionLoading(true);
    setReflectionError(null);
    setReflectionText(null);
    try {
      const res = await fetch("/api/reflect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: p, kind: "reflection" }),
      });
      if (!res.ok) throw new Error("Could not load reflection");
      const data = (await res.json()) as { text: string };
      setReflectionText(data.text);
      await addProgress({
        id: createId(),
        type: "reflection",
        note: data.text,
        createdAt: new Date().toISOString(),
      });
      await reloadProgress();
    } catch {
      setReflectionError("Something went wrong. You can try again in a moment.");
    } finally {
      setReflectionLoading(false);
    }
  }

  return (
    <main className="flex flex-col gap-8 px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <div>
        <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
          Progress
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          Your history on this device — streaks without shame.
        </p>
      </div>

      <StreakBadge streak={streak} />
      <HealthConnections />
      <HistoryList logs={logs} plan={plan} />

      {profile?.trackWeight ? (
        <WeightCheckIn snapshots={snapshots} onSaved={reloadProgress} />
      ) : null}

      {profile ? <MessageDrafts profile={profile} /> : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          Reflection
        </h2>
        <Button
          className="w-full"
          variant="ghost"
          disabled={!profile || reflectionLoading}
          onClick={() => profile && void writeReflection(profile)}
        >
          {reflectionLoading ? "Writing…" : "Write a short reflection"}
        </Button>
        {reflectionText ? (
          <p className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-base leading-relaxed text-[var(--ink)] ring-1 ring-white/10">
            {reflectionText}
          </p>
        ) : null}
        {reflectionError ? (
          <p className="text-sm text-[var(--muted)]">{reflectionError}</p>
        ) : null}
        {pastReflections.length > 0 ? (
          <ul className="mt-1 flex flex-col gap-2">
            {pastReflections.slice(0, 3).map((r) => (
              <li
                key={r.id}
                className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)] ring-1 ring-white/10"
              >
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  {new Date(r.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="mt-1 text-[var(--ink)]">{r.note}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
