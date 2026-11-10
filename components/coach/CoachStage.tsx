"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { getCoach } from "@/lib/coaches/presets";
import type { CoachId } from "@/lib/types";
import type { CSSProperties, ReactNode } from "react";

export function CoachStage({
  coachId, label, title, description, children,
}: { coachId: CoachId; label: string; title: string; description?: string; children?: ReactNode }) {
  const coach = getCoach(coachId);
  const reduceMotion = useReducedMotion();
  const palette = { "--coach-accent": coach.accent, "--coach-tint": coach.secondary } as CSSProperties;
  return (
    <section className="coach-stage" style={palette}>
      <div className="coach-stage-content">
        <p className="coach-stage-label">{label}</p>
        <h1 className="font-display mt-2 break-words text-[clamp(1.7rem,7.2vw,2.5rem)] leading-[1.04] font-bold tracking-[-0.045em]">{title}</h1>
        {description && <p className="coach-stage-subtitle mt-2">{description}</p>}
        {children}
      </div>
      <motion.div
        key={coach.id}
        className="coach-stage-portrait"
        initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.93 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 23 }}
        aria-hidden="true"
      >
        <Image src={`/coaches/${coach.id}.webp`} width={140} height={140} unoptimized alt="" />
      </motion.div>
    </section>
  );
}
