"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CoachAvatar } from "@/components/coach/CoachAvatar";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import type { Insight } from "@/lib/coach/insight";
import { requestInsight, todayIndex } from "@/lib/coach/notes";
import { applyPlanEdits } from "@/lib/coach/plan-edit";
import { getCoach } from "@/lib/coaches/presets";
import { createId } from "@/lib/ids";
import { onboardingRedirect } from "@/lib/navigation/onboarding";
import { getPlan, getProfile, listLogs, listPlanHistory, savePlan, saveCoachNote, upsertLog } from "@/lib/store";
import type { PlanSession, SessionFeeling, TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

const FEELINGS: { value: SessionFeeling; title: string; description: string }[] = [
  { value: "easy", title: "Easy", description: "I had more in me" },
  { value: "right", title: "About right", description: "Worked, but manageable" },
  { value: "hard", title: "Hard", description: "That took a lot" },
  { value: "pain", title: "Pain or discomfort", description: "Something hurt or felt off" },
];

export default function WorkoutPlayPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<PlanSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [skipAck, setSkipAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkIn, setCheckIn] = useState<"completed" | "partial" | null>(null);
  const [minutes, setMinutes] = useState("");
  const [feeling, setFeeling] = useState<SessionFeeling | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [reply, setReply] = useState<{ state: "loading" | "ready" | "error"; insight?: Insight; logs?: WorkoutLog[]; plan?: "kept" | "changed" | "error" } | null>(null);

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
        setProfile(profile);
        setPlan(plan);
        // The home screen's skip and done buttons land here with the matching step already open.
        const query = new URLSearchParams(window.location.search);
        if (found && query.has("skip")) setSkipAck(true);
        if (found && query.has("checkin")) {
          const planned = found.steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0);
          setMinutes(planned > 0 ? String(planned) : "");
          setCheckIn("completed");
        }
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
    details: Pick<WorkoutLog, "actualMinutes" | "feeling"> = {},
  ) {
    if (!session || saving) return;
    setSaving(true);
    const log: WorkoutLog = {
      id: createId(),
      sessionId: session.id,
      status,
      completedAt: new Date().toISOString(),
      ...details,
    };
    await upsertLog(log);
    router.push(after);
  }

  if (loading) {
    return (
      <main className="theme-dark flex min-h-[100dvh] items-center justify-center bg-[var(--app-canvas)] px-6">
        <p className="text-[var(--app-muted)]">Loading session…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="theme-dark flex min-h-[100dvh] flex-col bg-[var(--app-canvas)] px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] pt-[max(2rem,env(safe-area-inset-top))]">
        <h1 className="text-xl font-semibold text-[var(--app-text)]">
          Session not found
        </h1>
        <p className="mt-3 text-[var(--app-muted)]">
          It may have been updated in your plan.
        </p>
        <Button href="/today" className="mt-6 w-full">
          Back to Today
        </Button>
      </main>
    );
  }

  // The log is saved first, so a coach that is slow or offline never loses the check-in.
  async function saveCheckIn(status: "completed" | "partial", details: Pick<WorkoutLog, "actualMinutes" | "feeling">) {
    if (!session || !profile || saving) return;
    setSaving(true);
    const log: WorkoutLog = { id: createId(), sessionId: session.id, status, completedAt: new Date().toISOString(), ...details };
    await upsertLog(log);
    setReply({ state: "loading" });
    try {
      const [logs, history] = await Promise.all([listLogs(), listPlanHistory()]);
      const insight = await requestInsight("checkin", { profile, plan, history, logs }, log.id);
      await saveCoachNote("checkin", { key: log.id, coachId: profile.coachId ?? "river", text: insight.message, createdAt: log.completedAt });
      setReply({ state: "ready", insight, logs });
    } catch {
      setReply({ state: "error" });
    }
  }

  async function acceptProposal() {
    const edits = reply?.insight?.proposal?.edits;
    const edited = edits ? applyPlanEdits(plan, edits, reply?.logs ?? [], "", todayIndex()) : null;
    if (!edited) return setReply((current) => current && { ...current, plan: "error" });
    await savePlan(edited);
    setPlan(edited);
    setReply((current) => current && { ...current, plan: "changed" });
  }

  if (reply && session) {
    const coach = getCoach(profile?.coachId);
    const proposal = reply.insight?.proposal;
    return (
      <main className="theme-dark flex min-h-[100dvh] flex-col bg-[var(--app-canvas)] px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] pt-[max(2rem,env(safe-area-inset-top))]">
        <p className="meta-label">Saved</p>
        <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.045em] text-[var(--app-text)]">{session.title} logged</h1>
        <section aria-live="polite" className="mt-8 flex items-start gap-3">
          <CoachAvatar coachId={coach.id} size="sm" replying={reply.state === "loading"} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--app-muted)]">{coach.name}</p>
            <p className="mt-1 text-lg leading-relaxed text-[var(--app-text)]">
              {reply.state === "loading" ? `${coach.name} is reading your check-in…`
                : reply.state === "error" ? `Your check-in is saved. ${coach.name} couldn't reply right now.`
                  : reply.insight?.message}
            </p>
          </div>
        </section>
        {proposal ? (
          <section aria-label="Suggested change" className="mt-6 rounded-[var(--radius-panel)] border border-[var(--app-line)] bg-[var(--app-raised)] p-5">
            <p className="text-sm font-semibold text-[var(--app-muted)]">Suggested change</p>
            <p className="mt-1 text-base font-semibold text-[var(--app-text)]">{proposal.summary}</p>
            {reply.plan === "changed" ? (
              <p className="mt-4 text-sm font-semibold text-[var(--app-complete)]">Plan updated.</p>
            ) : reply.plan === "kept" ? (
              <p className="mt-4 text-sm text-[var(--app-muted)]">Plan kept as it was.</p>
            ) : (
              <div className="mt-4 flex gap-3">
                <Button className="flex-1" onClick={() => void acceptProposal()}>Yes, change it</Button>
                <Button variant="ghost" className="flex-1" onClick={() => setReply((current) => current && { ...current, plan: "kept" })}>Keep my plan</Button>
              </div>
            )}
            {reply.plan === "error" ? <p className="mt-3 text-sm text-[var(--app-muted)]">That change no longer fits your plan, so nothing was changed.</p> : null}
          </section>
        ) : null}
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Button className="w-full" disabled={reply.state === "loading"} onClick={() => router.push("/today")}>Done</Button>
          <Button href="/coach" variant="ghost" className="w-full">Talk to {coach.name}</Button>
        </div>
      </main>
    );
  }

  function startCheckIn(status: "completed" | "partial") {
    const planned = steps.reduce((sum, step) => sum + (step.durationMin ?? 0), 0);
    setMinutes(planned > 0 ? String(planned) : "");
    setFeeling(null);
    setCheckIn(status);
  }

  if (checkIn) {
    const value = Number(minutes);
    const validMinutes = minutes.trim() !== "" && Number.isInteger(value) && value >= 0 && value <= 600;
    return (
      <main className="theme-dark flex min-h-[100dvh] flex-col bg-[var(--app-canvas)] px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] pt-[max(2rem,env(safe-area-inset-top))]">
        <h1 className="text-[2rem] font-bold tracking-[-0.045em] text-[var(--app-text)]">How did it go?</h1>
        <p className="mt-2 text-[var(--app-muted)]">Your coach uses this to tune the plan.</p>
        <label htmlFor="actual-minutes" className="mt-8 text-sm font-semibold text-[var(--app-text)]">Minutes you did</label>
        <input
          id="actual-minutes"
          type="number"
          inputMode="numeric"
          min={0}
          max={600}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          className="mt-2 h-12 w-32 rounded-[var(--radius-control)] border border-[var(--app-line)] bg-[var(--app-raised)] px-4 text-lg text-[var(--app-text)] tabular-nums focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-focus)]"
        />
        <fieldset className="mt-8 flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold text-[var(--app-text)]">How did it feel?</legend>
          {FEELINGS.map((option) => (
            <ChoiceCard
              key={option.value}
              title={option.title}
              description={option.description}
              selected={feeling === option.value}
              onSelect={() => setFeeling(option.value)}
            />
          ))}
        </fieldset>
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Button
            className="w-full"
            disabled={saving || !validMinutes || !feeling}
            onClick={() => feeling && void saveCheckIn(checkIn, { actualMinutes: value, feeling })}
          >
            Save
          </Button>
          <Button variant="ghost" className="w-full" disabled={saving} onClick={() => setCheckIn(null)}>
            Back
          </Button>
        </div>
      </main>
    );
  }

  if (skipAck) {
    return (
      <main className="theme-dark flex min-h-[100dvh] flex-col justify-between bg-[var(--app-canvas)] px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] pt-[max(2rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="text-[2rem] font-bold tracking-[-0.045em] text-[var(--app-text)]">
            Okay — we can adjust.
          </h1>
          <p className="text-lg text-[var(--app-muted)]">
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
    <main className="theme-dark flex min-h-[100dvh] flex-col bg-[var(--app-canvas)] px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] pt-[max(2rem,env(safe-area-inset-top))]">
      <p className="meta-label">{progressLabel}</p>
      <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.045em] text-[var(--app-text)]">
        {session.title}
      </h1>

      {currentStep ? (
        <article className="mt-8 flex flex-1 flex-col rounded-[var(--radius-panel)] border border-[var(--app-line)] bg-[var(--app-raised)] p-5">
          <h2 className="text-xl font-semibold text-[var(--app-text)]">
            {currentStep.name}
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-[var(--app-muted)]">
            {currentStep.detail}
          </p>
          {currentStep.durationMin != null && (
            <p className="mt-4 text-sm text-[var(--app-muted)]">
              About {currentStep.durationMin} min
            </p>
          )}
        </article>
      ) : (
        <p className="mt-8 text-[var(--app-muted)]">No steps in this session.</p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {onLastStep || steps.length === 0 ? (
          <>
            <Button
              className="w-full"
              disabled={saving}
              onClick={() => startCheckIn("completed")}
            >
              Done
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={saving}
              onClick={() => startCheckIn("partial")}
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
