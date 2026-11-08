"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getProfile, savePlan } from "@/lib/store";
import type { TrainingPlan, UserProfile } from "@/lib/types";

export default function AcknowledgmentPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const p = await getProfile();
      if (!p) {
        router.replace("/");
        return;
      }
      if (cancelled) return;
      setProfile(p);
      try {
        const res = await fetch("/api/reflect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile: p, kind: "acknowledgment" }),
        });
        if (!res.ok) throw new Error("Could not load acknowledgment");
        const data = (await res.json()) as { text: string };
        if (!cancelled) setText(data.text);
      } catch {
        if (!cancelled) setError("Something went wrong. You can still start your week.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function startFirstWeek() {
    if (!profile) return;
    setPlanLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) throw new Error("Could not build plan");
      const data = (await res.json()) as { plan: TrainingPlan };
      await savePlan(data.plan);
      router.push("/today");
    } catch {
      setError("Could not save your plan. Try again in a moment.");
      setPlanLoading(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col justify-between px-6 pb-8 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="flex flex-1 flex-col justify-center gap-6">
        <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
          What I heard
        </h1>
        {loading ? (
          <p className="text-[var(--muted)]">Taking in your goal…</p>
        ) : (
          <p
            className={`text-lg leading-relaxed text-[var(--ink)] ${
              text ? "acknowledgment-fade-in" : ""
            }`}
          >
            {text ?? error ?? "Your goal is saved. Whenever you are ready, we can begin."}
          </p>
        )}
      </div>
      <Button
        className="w-full"
        disabled={loading || planLoading || !profile}
        onClick={startFirstWeek}
      >
        {planLoading ? "Building your week…" : "Start my first week"}
      </Button>
    </main>
  );
}
