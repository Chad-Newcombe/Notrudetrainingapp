"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CoachAvatar } from "@/components/coach/CoachAvatar";
import { CoachBubble } from "@/components/coach/CoachBubble";
import { Button } from "@/components/ui/Button";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { IntakeConversation } from "./IntakeConversation";
import { IntakeReview } from "./IntakeReview";
import { INTAKE_ANSWER_LIMIT, intakeProposalSchema, quickIntakeProposal, type IntakeBrief, type IntakeInput, type IntakeProposal } from "@/lib/intake";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { COACH_PRESETS, getCoach } from "@/lib/coaches/presets";
import { saveProfile } from "@/lib/store";
import { announceTheme } from "@/lib/theme";
import type {
  ChannelPref,
  CoachId,
  EngagementCadence,
  EngagementTone,
  MotivationStyle,
  UserProfile,
} from "@/lib/types";

const STEPS = ["coach", "goal", "routine", "support", "baseline", "weight", "style", "channels", "review"] as const;
type Step = (typeof STEPS)[number];

const emptyBrief: IntakeBrief = { trainingApproach: "", supportApproach: "", progressSignal: "" };

const TONE_OPTIONS: { value: EngagementTone; title: string; description: string }[] = [
  { value: "gentle", title: "Gentle", description: "Soft encouragement, lots of permission to rest." },
  { value: "steady", title: "Steady", description: "Calm and consistent—facts without pressure." },
  { value: "direct", title: "Direct", description: "Clear and honest, still kind." },
];

const CADENCE_OPTIONS: {
  value: EngagementCadence;
  title: string;
  description: string;
}[] = [
  { value: "brief", title: "Brief", description: "Short nudges when you need them." },
  { value: "conversational", title: "Conversational", description: "A bit more back-and-forth." },
  { value: "quiet", title: "Quiet", description: "Mostly on your terms—minimal pings." },
];

const MOTIVATION_OPTIONS: {
  value: MotivationStyle;
  title: string;
  description: string;
}[] = [
  { value: "celebrate_wins", title: "Celebrate wins", description: "Notice what went well." },
  { value: "process_focus", title: "Process focus", description: "Emphasis on showing up, not perfection." },
  { value: "accountability", title: "Light accountability", description: "Gentle check-ins, never shame." },
];

const CHANNEL_OPTIONS: { value: ChannelPref; title: string; description: string }[] = [
  { value: "in_app", title: "In-app coach", description: "Chat with me inside Notrude anytime." },
  { value: "text_style", title: "Text check-ins", description: "I’ll send short texts to you (in-app for now)." },
  { value: "email_outline", title: "Email check-ins", description: "I’ll send you fuller weekly emails (in-app for now)." },
];

const ACTIVITY_LEVELS = [
  { value: "", label: "Prefer not to say" },
  { value: "sedentary", label: "Mostly sedentary" },
  { value: "light", label: "Light activity" },
  { value: "moderate", label: "Moderately active" },
  { value: "active", label: "Very active" },
];

type Draft = {
  coachId: CoachId | null;
  goalText: string;
  routine: string;
  support: string;
  progress: string;
  currentWeightLbs: string;
  activityLevel: string;
  constraints: string;
  trackWeight: boolean;
  targetWeightLbs: string;
  targetDescription: string;
  tone: EngagementTone;
  cadence: EngagementCadence;
  motivation: MotivationStyle;
  channels: ChannelPref[];
};

const initialDraft: Draft = {
  coachId: null,
  goalText: "",
  routine: "",
  support: "",
  progress: "",
  currentWeightLbs: "",
  activityLevel: "",
  constraints: "",
  trackWeight: false,
  targetWeightLbs: "",
  targetDescription: "",
  tone: "gentle",
  cadence: "brief",
  motivation: "process_focus",
  channels: ["in_app"],
};

const fieldClass =
  "min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--app-line)] bg-[var(--app-raised)] px-4 py-3 text-base text-[var(--app-text)] placeholder:text-[var(--app-muted)] focus:outline focus:outline-3 focus:outline-offset-2 focus:outline-[var(--app-focus)]";

export function QuizWizard({ profile: existing, hasPlan }: { profile: UserProfile | null; hasPlan: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("coach");
  const [draft, setDraft] = useState<Draft>(() => existing ? {
    ...initialDraft,
    ...existing,
    constraints: existing.constraints ?? "",
    activityLevel: existing.activityLevel ?? "",
    currentWeightLbs: String(existing.currentWeightLbs ?? ""),
    targetWeightLbs: String(existing.targetWeightLbs ?? ""),
    targetDescription: existing.targetDescription ?? "",
  } : initialDraft);
  const [brief, setBrief] = useState(existing?.intakeBrief ?? emptyBrief);
  const [review, setReview] = useState<{ reply: string; source: "quick" | "coach" } | null>(null);
  const [saveError, setSaveError] = useState(false);
  const reviewRequest = useRef<AbortController | null>(null);
  const reviewedInput = useRef<string | null>(null);
  const themeCommitted = useRef(false);
  const savedTheme = useRef({
    coachId: existing?.coachId ?? "river",
    appearance: existing?.appearance ?? "system",
  } as const);

  useEffect(() => () => {
    reviewRequest.current?.abort();
    if (!themeCommitted.current) announceTheme(savedTheme.current);
  }, []);
  const [saving, setSaving] = useState(false);

  const goalValid = draft.goalText.trim().length > 0;
  const coach = draft.coachId ? getCoach(draft.coachId) : null;

  const steps = STEPS.filter((name) => name !== "weight" || draft.trackWeight);
  const stepIndex = steps.indexOf(step);

  function patch(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  function selectCoach(id: CoachId) {
    if (id === draft.coachId) return;
    const c = getCoach(id);
    patch({
      coachId: id,
      tone: c.defaultTone,
      cadence: c.defaultCadence,
      motivation: c.defaultMotivation,
    });
    announceTheme({ coachId: id, appearance: existing?.appearance ?? "system" });
  }

  function toggleChannel(ch: ChannelPref) {
    setDraft((d) => {
      const has = d.channels.includes(ch);
      if (has) {
        const next = d.channels.filter((c) => c !== ch);
        return { ...d, channels: next.length ? next : ["in_app"] };
      }
      return { ...d, channels: [...d.channels, ch] };
    });
  }

  function goNext() {
    const next = steps[stepIndex + 1];
    if (next) setStep(next);
  }

  function goBack() {
    reviewRequest.current?.abort();
    setSaveError(false);
    const previous = steps[stepIndex - 1];
    if (previous) setStep(previous);
  }

  function intakeInput(): IntakeInput {
    return {
      coachId: draft.coachId!,
      goal: draft.goalText.trim().slice(0, INTAKE_ANSWER_LIMIT),
      routine: draft.routine.trim(),
      support: draft.support.trim(),
      progress: draft.progress.trim(),
      constraints: draft.constraints.trim().slice(0, INTAKE_ANSWER_LIMIT),
      tone: draft.tone,
    };
  }

  function showReview(proposal: IntakeProposal, source: "quick" | "coach", input: IntakeInput) {
    const { reply, ...notes } = proposal;
    setBrief({
      trainingApproach: notes.trainingApproach || existing?.intakeBrief?.trainingApproach || "",
      supportApproach: notes.supportApproach || existing?.intakeBrief?.supportApproach || "",
      progressSignal: notes.progressSignal || existing?.intakeBrief?.progressSignal || "",
    });
    reviewedInput.current = JSON.stringify(input);
    setReview({ reply, source });
  }

  function useQuickReview() {
    reviewRequest.current?.abort();
    const input = intakeInput();
    showReview(quickIntakeProposal(input), "quick", input);
  }

  async function prepareReview() {
    const input = intakeInput();
    setStep("review");
    if (reviewedInput.current === JSON.stringify(input)) return;
    if (!input.routine && !input.support && !input.progress && !input.constraints) {
      showReview(quickIntakeProposal(input), "quick", input);
      return;
    }

    const request = new AbortController();
    reviewRequest.current = request;
    setReview(null);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(80_000)]),
      });
      if (!res.ok) throw new Error("Could not prepare coaching notes");
      const data = await res.json();
      if (!request.signal.aborted) {
        showReview(intakeProposalSchema.parse(data.proposal), data.source === "coach" ? "coach" : "quick", input);
      }
    } catch {
      if (!request.signal.aborted) showReview(quickIntakeProposal(input), "quick", input);
    }
  }

  async function finish() {
    if (!draft.coachId) return;
    setSaving(true);
    setSaveError(false);
    try {
      const channels =
        draft.channels.length > 0 ? draft.channels : (["in_app"] as ChannelPref[]);
      const profile: UserProfile = {
        goalText: draft.goalText.trim(),
        intakeBrief: Object.values(brief).some((value) => value.trim()) ? {
          trainingApproach: brief.trainingApproach.trim(),
          supportApproach: brief.supportApproach.trim(),
          progressSignal: brief.progressSignal.trim(),
        } : undefined,
        tone: draft.tone,
        cadence: draft.cadence,
        motivation: draft.motivation,
        channels,
        trackWeight: draft.trackWeight,
        coachId: draft.coachId,
        appearance: existing?.appearance ?? "system",
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      const cw = draft.currentWeightLbs.trim();
      if (cw) profile.currentWeightLbs = Number(cw);
      if (draft.activityLevel) profile.activityLevel = draft.activityLevel;
      if (draft.constraints.trim()) profile.constraints = draft.constraints.trim();
      if (draft.trackWeight) {
        const tw = draft.targetWeightLbs.trim();
        if (tw) profile.targetWeightLbs = Number(tw);
        const td = draft.targetDescription.trim();
        if (td) profile.targetDescription = td;
      }
      await saveProfile(profile);
      themeCommitted.current = true;
      router.push(hasPlan ? "/coach" : "/acknowledgment");
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--app-canvas)] px-6 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mb-8">
        <ProgressDots total={steps.length} current={stepIndex} />
      </div>

      <div key={step} className="quiz-step-in flex flex-1 flex-col gap-6">
        {step === "coach" && (
          <>
            <div className="space-y-2">
              <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--app-text)]">
                Who’s coaching you?
              </h1>
              <p className="leading-relaxed text-[var(--app-muted)]">
                Pick a coach — same care, different energy. You can feel the vibe before you commit.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {COACH_PRESETS.map((c) => {
                const selected = draft.coachId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectCoach(c.id)}
                    className="coach-choice flex flex-col items-center gap-2 rounded-[var(--radius-panel)] border px-3 py-4 text-center"
                    style={{ "--coach-tint": c.secondary, "--coach-accent": c.accent } as CSSProperties}
                  >
                    <CoachAvatar coachId={c.id} size="lg" />
                    <span className="text-base font-semibold text-[var(--app-text)]">
                      {c.name}
                    </span>
                    <span className="text-xs leading-snug text-[var(--app-muted)]">
                      {c.vibe}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "goal" && coach && (
          <>
            <CoachBubble coachId={coach.id}>{coach.whyPrompts.goal}</CoachBubble>
            <div className="space-y-2">
              <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--app-text)]">
                What are you working toward?
              </h1>
              <p className="leading-relaxed text-[var(--app-muted)]">
                In your own words—ultra, strength, moving more, anything counts.
              </p>
            </div>
            <textarea
              className={`${fieldClass} min-h-[140px] resize-y`}
              placeholder="e.g. train for a 50k, or start walking again without guilt"
              aria-label="What are you working toward?"
              maxLength={INTAKE_ANSWER_LIMIT}
              value={draft.goalText}
              onChange={(e) => patch({ goalText: e.target.value })}
              rows={5}
              autoFocus
            />
          </>
        )}

        {(step === "routine" || step === "support") && coach && (
          <IntakeConversation
            coachId={coach.id}
            goal={draft.goalText}
            routine={draft.routine}
            support={draft.support}
            progress={draft.progress}
            onChange={(field, value) => patch({ [field]: value })}
            followUp={step === "support"}
            fieldClass={fieldClass}
          />
        )}

        {step === "baseline" && coach && (
          <>
            <CoachBubble coachId={coach.id}>{coach.whyPrompts.now}</CoachBubble>
            <div className="space-y-2">
              <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--app-text)]">
                Where are you starting?
              </h1>
              <p className="leading-relaxed text-[var(--app-muted)]">
                Optional context helps me meet you where you are.
              </p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--app-muted)]">Current weight (lbs)</span>
              <input
                type="number"
                inputMode="decimal"
                className={fieldClass}
                placeholder="Optional"
                value={draft.currentWeightLbs}
                onChange={(e) => patch({ currentWeightLbs: e.target.value })}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--app-muted)]">Activity level</span>
              <select
                className={fieldClass}
                value={draft.activityLevel}
                onChange={(e) => patch({ activityLevel: e.target.value })}
              >
                {ACTIVITY_LEVELS.map((o) => (
                  <option key={o.value || "none"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--app-muted)]">Constraints or injuries</span>
              <textarea
                className={`${fieldClass} min-h-[80px] resize-y`}
                placeholder="Optional—knee issues, schedule limits, etc."
                maxLength={INTAKE_ANSWER_LIMIT}
                value={draft.constraints}
                onChange={(e) => patch({ constraints: e.target.value })}
                rows={3}
              />
            </label>
            <label className="panel flex cursor-pointer items-start gap-3 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--app-accent)]"
                checked={draft.trackWeight}
                onChange={(e) => patch({ trackWeight: e.target.checked })}
              />
              <span className="text-sm leading-relaxed text-[var(--app-text)]">
                I&apos;d like to track weight over time (optional, no judgment)
              </span>
            </label>
          </>
        )}

        {step === "weight" && draft.trackWeight && coach && (
          <>
            <CoachBubble coachId={coach.id}>{coach.whyPrompts.target}</CoachBubble>
            <div className="space-y-2">
              <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--app-text)]">
                What does better look like?
              </h1>
              <p className="leading-relaxed text-[var(--app-muted)]">
                Optional numbers or words—whatever helps you picture progress.
              </p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--app-muted)]">Target weight (lbs)</span>
              <input
                type="number"
                inputMode="decimal"
                className={fieldClass}
                placeholder="Optional"
                value={draft.targetWeightLbs}
                onChange={(e) => patch({ targetWeightLbs: e.target.value })}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--app-muted)]">Or describe it</span>
              <textarea
                className={`${fieldClass} min-h-[100px] resize-y`}
                placeholder="e.g. clothes fit easier, more energy on walks"
                value={draft.targetDescription}
                onChange={(e) => patch({ targetDescription: e.target.value })}
                rows={4}
              />
            </label>
          </>
        )}

        {step === "style" && coach && (
          <>
            <CoachBubble coachId={coach.id}>{coach.whyPrompts.engagement}</CoachBubble>
            <div className="space-y-2">
              <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--app-text)]">
                How should I show up?
              </h1>
              <p className="leading-relaxed text-[var(--app-muted)]">
                Defaults follow {coach.name} — tweak anything.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--app-muted)]">Tone</p>
              <div className="flex flex-col gap-2">
                {TONE_OPTIONS.map((o) => (
                  <ChoiceCard
                    key={o.value}
                    title={o.title}
                    description={o.description}
                    selected={draft.tone === o.value}
                    onSelect={() => patch({ tone: o.value })}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--app-muted)]">Cadence</p>
              <div className="flex flex-col gap-2">
                {CADENCE_OPTIONS.map((o) => (
                  <ChoiceCard
                    key={o.value}
                    title={o.title}
                    description={o.description}
                    selected={draft.cadence === o.value}
                    onSelect={() => patch({ cadence: o.value })}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--app-muted)]">Motivation</p>
              <div className="flex flex-col gap-2">
                {MOTIVATION_OPTIONS.map((o) => (
                  <ChoiceCard
                    key={o.value}
                    title={o.title}
                    description={o.description}
                    selected={draft.motivation === o.value}
                    onSelect={() => patch({ motivation: o.value })}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {step === "channels" && coach && (
          <>
            <CoachBubble coachId={coach.id}>{coach.whyPrompts.channels}</CoachBubble>
            <div className="space-y-2">
              <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--app-text)]">
                How would you like to check in?
              </h1>
              <p className="leading-relaxed text-[var(--app-muted)]">
                Text and email check-ins appear in your Notrude Inbox.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {CHANNEL_OPTIONS.map((o) => (
                <ChoiceCard
                  key={o.value}
                  title={o.title}
                  description={o.description}
                  selected={draft.channels.includes(o.value)}
                  onSelect={() => toggleChannel(o.value)}
                />
              ))}
            </div>
          </>
        )}
        {step === "review" && coach && (
          <IntakeReview
            coachId={coach.id}
            brief={brief}
            reply={review?.reply ?? ""}
            source={review?.source ?? "quick"}
            pending={!review}
            onQuickReview={useQuickReview}
            onChange={(field, value) => setBrief((current) => ({ ...current, [field]: value }))}
            fieldClass={fieldClass}
          />
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {step === "coach" && (
          <Button className="w-full" disabled={!draft.coachId} onClick={goNext}>
            Continue with {draft.coachId ? getCoach(draft.coachId).name : "coach"}
          </Button>
        )}
        {step === "goal" && (
          <Button className="w-full" disabled={!goalValid || saving} onClick={goNext}>
            Continue
          </Button>
        )}
        {(step === "routine" || step === "support") && (
          <Button className="w-full" onClick={goNext}>
            {step === "routine" ? (draft.routine.trim() ? "Continue" : "Skip for now")
              : (draft.support.trim() || draft.progress.trim() ? "Continue" : "Skip for now")}
          </Button>
        )}
        {step === "baseline" && (
          <>
            <Button className="w-full" onClick={goNext}>
              Continue
            </Button>
            <Button variant="ghost" className="w-full" onClick={goNext}>
              Skip for now
            </Button>
          </>
        )}
        {step === "weight" && draft.trackWeight && (
          <>
            <Button className="w-full" onClick={goNext}>
              Continue
            </Button>
            <Button variant="ghost" className="w-full" onClick={goNext}>
              Skip for now
            </Button>
          </>
        )}
        {step === "style" && (
          <Button className="w-full" onClick={goNext}>
            Continue
          </Button>
        )}
        {step === "channels" && (
          <Button className="w-full" onClick={() => void prepareReview()}>
            Review with {coach?.name}
          </Button>
        )}
        {step === "review" && (
          <Button className="w-full" disabled={saving || !review} onClick={() => void finish()}>
            {saving ? "Saving…" : "Save coaching preferences"}
          </Button>
        )}
        {saveError && <p role="alert" className="text-sm text-[var(--app-muted)]">Couldn’t save your preferences. Try again.</p>}
        {stepIndex > 0 && (
          <Button variant="ghost" className="w-full" disabled={saving} onClick={goBack}>
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
