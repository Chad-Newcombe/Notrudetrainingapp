"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { createId } from "@/lib/ids";
import { onboardingRedirect } from "@/lib/navigation/onboarding";
import { getPlan, getProfile, upsertLog } from "@/lib/store";
import type { PlanSession, WorkoutLog } from "@/lib/types";

export default function WorkoutPlayPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<PlanSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [skipAck, setSkipAck] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [profile, plan] = await Promise.all([getProfile(), getPlan()]);
      const dest = onboardingRedirect(profile, plan);
      if (dest) {
        router.replace(dest);
        return;
      }
      if (!plan) {
        setLoading(false);
        return;
      }
      const found = plan.sessions.find((s) => s.id === sessionId) ?? null;
      if (!cancelled) {
        setSession(found);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  const steps = session?.steps ?? [];
  const onLastStep = stepIndex >= steps.length - 1;
  const currentStep = steps[stepIndex];

  const progressLabel = useMemo(() => {
    if (!steps.length) return "";
    return `Step ${stepIndex + 1} of ${steps.length}`;
  }, [stepIndex, steps.length]);

  async function saveLog(
    status: WorkoutLog["status"],
    after: "/today" | "/coach" = "/today",
  ) {
    if (!session || saving) return;
    setSaving(true);
    const log: WorkoutLog = {
      id: createId(),
      sessionId: session.id,
      status,
      completedAt: new Date().toISOString(),
    };
    await upsertLog(log);
    router.push(after);
  }

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center px-6">
        <p className="text-[var(--muted)]">Loading session…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
        <h1 className="font-display text-xl text-[var(--ink)]">
          Session not found
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          It may have been updated in your plan.
        </p>
        <Button href="/today" className="mt-6 w-full">
          Back to Today
        </Button>
      </main>
    );
  }

  if (skipAck) {
    return (
      <main className="flex min-h-[100dvh] flex-col justify-between px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="font-display text-2xl text-[var(--ink)]">
            Okay — we can adjust.
          </h1>
          <p className="text-lg text-[var(--muted)]">
            Want a lighter option in Coach?
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            disabled={saving}
            onClick={() => void saveLog("skipped", "/coach")}
          >
            Open Coach
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={saving}
            onClick={() => void saveLog("skipped")}
          >
            Back to Today
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <p className="text-sm text-[var(--muted)]">{progressLabel}</p>
      <h1 className="mt-1 font-display text-2xl text-[var(--ink)]">
        {session.title}
      </h1>

      {currentStep ? (
        <article className="mt-8 flex flex-1 flex-col rounded-2xl bg-[var(--surface)] p-5 ring-1 ring-white/10">
          <h2 className="text-xl font-medium text-[var(--ink)]">
            {currentStep.name}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-[var(--muted)]">
            {currentStep.detail}
          </p>
          {currentStep.durationMin != null && (
            <p className="mt-4 text-sm text-[var(--muted)]">
              About {currentStep.durationMin} min
            </p>
          )}
        </article>
      ) : (
        <p className="mt-8 text-[var(--muted)]">No steps in this session.</p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {onLastStep || steps.length === 0 ? (
          <>
            <Button
              className="w-full"
              disabled={saving}
              onClick={() => void saveLog("completed")}
            >
              Done
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={saving}
              onClick={() => void saveLog("partial")}
            >
              Partial
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={saving}
              onClick={() => setSkipAck(true)}
            >
              Skip
            </Button>
          </>
        ) : (
          <Button
            className="w-full"
            onClick={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
          >
            Next step
          </Button>
        )}
        {!onLastStep && steps.length > 0 && (
          <Button
            variant="ghost"
            className="w-full"
            disabled={saving}
            onClick={() => setSkipAck(true)}
          >
            Skip
          </Button>
        )}
      </div>
    </main>
  );
}
