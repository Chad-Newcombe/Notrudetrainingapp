import { CoachAvatar } from "@/components/coach/CoachAvatar";
import { getCoach } from "@/lib/coaches/presets";
import type { CoachId } from "@/lib/types";

type Props = {
  coachId: CoachId;
  children: string;
};

export function CoachBubble({ coachId, children }: Props) {
  const coach = getCoach(coachId);

  return (
    <div className="flex gap-3">
      <CoachAvatar coachId={coachId} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-xs font-semibold tracking-tight text-[var(--muted)]">
          {coach.name}
        </p>
        <div
          className="mt-1 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--canvas-light)] px-3.5 py-3 text-sm leading-relaxed text-[var(--ink)]"
          style={{ borderLeftWidth: 3, borderLeftColor: coach.accent }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
