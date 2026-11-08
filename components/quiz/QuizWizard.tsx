"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { saveProfile } from "@/lib/store";
import type {
  ChannelPref,
  EngagementCadence,
  EngagementTone,
  MotivationStyle,
  UserProfile,
} from "@/lib/types";

const TOTAL_STEPS = 5;

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
  { value: "in_app", title: "In-app coach", description: "Chat inside Notrude (always available)." },
  { value: "text_style", title: "Text-style nudges", description: "Short messages you can copy to SMS." },
  { value: "email_outline", title: "Email outlines", description: "Draft check-ins you can send yourself." },
];

const ACTIVITY_LEVELS = [
  { value: "", label: "Prefer not to say" },
  { value: "sedentary", label: "Mostly sedentary" },
  { value: "light", label: "Light activity" },
  { value: "moderate", label: "Moderately active" },
  { value: "active", label: "Very active" },
];

type Draft = {
  goalText: string;
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
  goalText: "",
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
  "w-full rounded-2xl border-0 bg-[var(--surface)] px-4 py-3 text-base text-[var(--ink)] ring-1 ring-[var(--muted)]/25 placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]";

export function QuizWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [saving, setSaving] = useState(false);

  const goalValid = draft.goalText.trim().length > 0;

  const visibleStep = useMemo(() => {
    if (step === 2 && !draft.trackWeight) return 3;
    return step;
  }, [step, draft.trackWeight]);

  function patch(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
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
    if (step === 1 && !draft.trackWeight) {
      setStep(3);
      return;
    }
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  }

  function goBack() {
    if (step === 3 && !draft.trackWeight) {
      setStep(1);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  }

  async function finish() {
    setSaving(true);
    try {
      const channels =
        draft.channels.length > 0 ? draft.channels : (["in_app"] as ChannelPref[]);
      const profile: UserProfile = {
        goalText: draft.goalText.trim(),
        tone: draft.tone,
        cadence: draft.cadence,
        motivation: draft.motivation,
        channels,
        trackWeight: draft.trackWeight,
        createdAt: new Date().toISOString(),
      };
      const cw = draft.currentWeightLbs.trim();
      if (cw) profile.currentWeightLbs = Number(cw);
      if (draft.activityLevel) profile.activityLevel = draft.activityLevel;
      if (draft.constraints.trim()) profile.constraints = draft.constraints.trim();
      if (draft.trackWeight) {
        const tw = draft.targetWeightLbs.trim();
        if (tw) profile.targetWeightLbs = Number(tw);
      }
      if (draft.targetDescription.trim()) {
        profile.targetDescription = draft.targetDescription.trim();
      }
      await saveProfile(profile);
      router.push("/acknowledgment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col px-6 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mb-8">
        <ProgressDots total={TOTAL_STEPS} current={visibleStep} />
      </div>

      <div key={step} className="quiz-step-in flex flex-1 flex-col gap-6">
        {step === 0 && (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
                What are you working toward?
              </h1>
              <p className="text-[var(--muted)] leading-relaxed">
                In your own words—ultra, strength, moving more, anything counts.
              </p>
            </div>
            <textarea
              className={`${fieldClass} min-h-[140px] resize-y`}
              placeholder="e.g. train for a 50k, or start walking again without guilt"
              value={draft.goalText}
              onChange={(e) => patch({ goalText: e.target.value })}
              rows={5}
              autoFocus
            />
          </>
        )}

        {step === 1 && (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
                Where are you now?
              </h1>
              <p className="text-[var(--muted)] leading-relaxed">
                All optional—you can skip anything you prefer not to share.
              </p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">Current weight (lbs)</span>
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
              <span className="text-sm text-[var(--muted)]">Activity level</span>
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
              <span className="text-sm text-[var(--muted)]">Constraints or injuries</span>
              <textarea
                className={`${fieldClass} min-h-[80px] resize-y`}
                placeholder="Optional—knee issues, schedule limits, etc."
                value={draft.constraints}
                onChange={(e) => patch({ constraints: e.target.value })}
                rows={3}
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[var(--surface)] p-4 ring-1 ring-[var(--muted)]/25">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
                checked={draft.trackWeight}
                onChange={(e) => patch({ trackWeight: e.target.checked })}
              />
              <span className="text-sm leading-relaxed text-[var(--ink)]">
                I&apos;d like to track weight over time (optional, no judgment)
              </span>
            </label>
          </>
        )}

        {step === 2 && draft.trackWeight && (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
                What does better look like?
              </h1>
              <p className="text-[var(--muted)] leading-relaxed">
                Optional numbers or words—whatever helps you picture progress.
              </p>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">Target weight (lbs)</span>
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
              <span className="text-sm text-[var(--muted)]">Or describe it</span>
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

        {step === 3 && (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
                How should coaching feel?
              </h1>
              <p className="text-[var(--muted)] leading-relaxed">
                Pick what fits—you can change this later.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--muted)]">Tone</p>
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
              <p className="text-sm font-medium text-[var(--muted)]">Cadence</p>
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
              <p className="text-sm font-medium text-[var(--muted)]">Motivation</p>
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

        {step === 4 && (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
                How do you want to hear from us?
              </h1>
              <p className="text-[var(--muted)] leading-relaxed">
                Choose any that help—in-app is always on if you pick nothing else.
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
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {step === 0 && (
          <Button className="w-full" disabled={!goalValid || saving} onClick={goNext}>
            Continue
          </Button>
        )}
        {step === 1 && (
          <>
            <Button className="w-full" onClick={goNext}>
              Continue
            </Button>
            <Button variant="ghost" className="w-full" onClick={goNext}>
              Skip for now
            </Button>
          </>
        )}
        {step === 2 && draft.trackWeight && (
          <>
            <Button className="w-full" onClick={goNext}>
              Continue
            </Button>
            <Button variant="ghost" className="w-full" onClick={goNext}>
              Skip for now
            </Button>
          </>
        )}
        {step === 3 && (
          <Button className="w-full" onClick={goNext}>
            Continue
          </Button>
        )}
        {step === 4 && (
          <Button className="w-full" disabled={saving} onClick={finish}>
            {saving ? "Saving…" : "Finish"}
          </Button>
        )}
        {step > 0 && (
          <Button variant="ghost" className="w-full" onClick={goBack}>
            Back
          </Button>
        )}
      </div>
    </div>
  );
}
