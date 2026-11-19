"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CoachChat } from "@/components/coach/CoachChat";
import { mix, type CoachPalette } from "@/lib/coaches/palette";
import { getCoach } from "@/lib/coaches/presets";
import { startCoachConversation } from "@/lib/store/coach-conversations";
import type { CoachConversation, TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type Props = {
  open: boolean;
  profile: UserProfile;
  plan: TrainingPlan | null;
  logs: WorkoutLog[];
  palette: CoachPalette;
  onClose: () => void;
};

/** The coach chat on frosted glass over the home screen, under the floating orb. */
export function CoachGlass({ open, profile, plan, logs, palette, onClose }: Props) {
  const coach = getCoach(profile.coachId);
  const [conversation, setConversation] = useState<CoachConversation | null>(null);
  const [failed, setFailed] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  // One chat per opening of the glass; the session lifecycle archives it when the user leaves Today.
  useEffect(() => {
    if (!open || conversation) return;
    let live = true;
    void startCoachConversation(coach.id).then((record) => live && setConversation(record), () => live && setFailed(true));
    return () => { live = false; };
  }, [open, conversation, coach.id]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    // Escape closes the glass wherever focus is, including after a button inside the chat goes away.
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${coach.name}`}
      aria-hidden={!open}
      inert={!open || undefined}
      data-open={open || undefined}
      className="bento-glass-layer theme-dark"
      style={{ backgroundColor: `${mix(palette.deep, "#000000", 0.45)}8c` }}
    >
      <button ref={closeButton} type="button" onClick={onClose} aria-label={`Close ${coach.name}`} className="bento-glass-button absolute right-4 top-[max(1.25rem,env(safe-area-inset-top))] size-11">
        <X size={18} aria-hidden />
      </button>
      <div className="mx-auto flex h-full w-full max-w-xl flex-col overflow-y-auto px-4 pb-6 pt-[14rem]">
        <p className="mb-4 text-center"><span className="block font-display text-2xl font-bold">{coach.name}</span><span className="text-sm text-white/75">{coach.vibe}</span></p>
        {failed ? <p role="alert">Couldn’t open a chat with {coach.name}. Try again in a moment.</p>
          : conversation ? <CoachChat key={conversation.id} variant="glass" conversation={conversation} profile={profile} plan={plan} logs={logs} />
            : <p role="status">Opening a chat with {coach.name}…</p>}
      </div>
    </section>
  );
}
