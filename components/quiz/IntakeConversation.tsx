import { CoachBubble } from "@/components/coach/CoachBubble";
import { INTAKE_ANSWER_LIMIT, intakeFollowUp, intakeOpening } from "@/lib/intake";
import type { CoachId } from "@/lib/types";

export function IntakeConversation({
  coachId, goal, routine, support, progress, onChange, followUp, fieldClass,
}: {
  coachId: CoachId;
  goal: string;
  routine: string;
  support: string;
  progress: string;
  onChange: (field: "routine" | "support" | "progress", value: string) => void;
  followUp: boolean;
  fieldClass: string;
}) {
  return (
    <>
      <CoachBubble coachId={coachId}>
        {followUp ? intakeFollowUp(coachId, routine) : intakeOpening(coachId, goal)}
      </CoachBubble>
      <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--app-text)]">
        {followUp ? "What would good coaching feel like?" : "What does a real week look like?"}
      </h1>
      <p className="leading-relaxed text-[var(--app-muted)]">
        Answer in your own words or skip anything you’d rather leave open.
      </p>
      {followUp ? (
        <>
          <label className="space-y-2">
            <span className="text-sm font-medium">What helps when the week gets away from you?</span>
            <textarea className={fieldClass} rows={3} maxLength={INTAKE_ANSWER_LIMIT}
              value={support} onChange={(e) => onChange("support", e.target.value)}
              placeholder="Give me a smaller option and let me decide when I’m ready." />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">What would tell you this is working?</span>
            <textarea className={fieldClass} rows={3} maxLength={INTAKE_ANSWER_LIMIT}
              value={progress} onChange={(e) => onChange("progress", e.target.value)}
              placeholder="I’d like to finish work with enough energy to go for a walk." />
          </label>
        </>
      ) : (
        <label className="space-y-2">
          <span className="text-sm font-medium">What fits, and what tends to get in the way?</span>
          <textarea className={fieldClass} rows={4} maxLength={INTAKE_ANSWER_LIMIT}
            value={routine} onChange={(e) => onChange("routine", e.target.value)}
            placeholder="My shifts rotate. I have some room after work and prefer training at home." />
        </label>
      )}
    </>
  );
}
