import { CoachBubble } from "@/components/coach/CoachBubble";
import { Button } from "@/components/ui/Button";
import type { IntakeBrief } from "@/lib/intake";
import type { CoachId } from "@/lib/types";

const fields: { key: keyof IntakeBrief; label: string; placeholder: string }[] = [
  { key: "trainingApproach", label: "How to shape my training", placeholder: "Keep a shorter option for busy days." },
  { key: "supportApproach", label: "How to coach me when plans change", placeholder: "Ask what would feel doable today." },
  { key: "progressSignal", label: "What I want to count as progress", placeholder: "Notice when getting started feels easier." },
];

export function IntakeReview({
  coachId, brief, reply, source, pending, onQuickReview, onChange, fieldClass,
}: {
  coachId: CoachId;
  brief: IntakeBrief;
  reply: string;
  source: "quick" | "coach";
  pending: boolean;
  onQuickReview: () => void;
  onChange: (field: keyof IntakeBrief, value: string) => void;
  fieldClass: string;
}) {
  return (
    <>
      <h1 className="text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--app-text)]">
        What I’ll take into your coaching
      </h1>
      {pending ? (
        <>
          <p role="status" className="text-[var(--app-muted)]">I’m thinking through what you told me.</p>
          <Button variant="ghost" onClick={onQuickReview}>Review without waiting</Button>
        </>
      ) : (
        <>
          <CoachBubble coachId={coachId}>{reply}</CoachBubble>
          <p className="leading-relaxed text-[var(--app-muted)]">
            {source === "quick" ? "This is a quick draft. Add anything I missed. " : ""}
            You can edit or clear any note before saving. I’ll use the saved notes for future plans and check-ins.
          </p>
          {fields.map(({ key, label, placeholder }) => (
            <label className="space-y-2" key={key}>
              <span className="text-sm font-medium">{label}</span>
              <textarea className={fieldClass} maxLength={220} rows={2} value={brief[key]}
                placeholder={placeholder} onChange={(e) => onChange(key, e.target.value)} />
            </label>
          ))}
        </>
      )}
    </>
  );
}
