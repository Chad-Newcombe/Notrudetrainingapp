"use client";

import { CoachModelPreview } from "@/components/coach/CoachModelPreview";
import { getCoach } from "@/lib/coaches/presets";
import type { CoachId } from "@/lib/types";
import type { CSSProperties, ReactNode } from "react";

export function CoachStage({
  coachId, label, title, description, children, replying = false, conversation = false,
}: {
  coachId: CoachId;
  label: string;
  title: string;
  description?: string;
  children?: ReactNode;
  replying?: boolean;
  conversation?: boolean;
}) {
  const coach = getCoach(coachId);
  const palette = { "--coach-accent": coach.accent, "--coach-tint": coach.secondary } as CSSProperties;
  return (
    <section className={conversation ? "coach-companion coach-companion-chat" : "coach-companion"} style={palette}>
      <div className="coach-companion-scene">
        <CoachModelPreview key={coach.id} coach={coach} presentation="companion" replying={replying} />
      </div>
      <div>
        <p className="meta-label">{label}</p>
        <h1 className="mt-2 break-words text-[clamp(1.7rem,7.2vw,2.5rem)] leading-[1.04] font-bold tracking-[-0.045em] text-[var(--app-text)]">{title}</h1>
        {description && <p className="mt-2 text-sm text-[var(--app-muted)]">{description}</p>}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </section>
  );
}
