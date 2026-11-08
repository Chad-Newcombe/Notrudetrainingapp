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
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

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
        {offline ? (
          <p className="text-sm text-[var(--muted)]">
            Offline — we&apos;ll use saved demo copy when the server can&apos;t
            reach AI.
          </p>
        ) : null}
        {loading ? (
          <p className="text-[var(--muted)]" aria-live="polite">
            Taking in your goal…
          </p>
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
      {planLoading ? (
        <p
          className="mb-2 text-center text-sm text-[var(--muted)]"
          aria-live="polite"
        >
          Building your week — usually just a moment…
        </p>
      ) : null}
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
