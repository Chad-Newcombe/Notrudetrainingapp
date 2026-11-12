import type { CSSProperties } from "react";
import { getCoach } from "@/lib/coaches/presets";
import type { CoachId } from "@/lib/types";

type Props = {
  coachId: CoachId;
  size?: "sm" | "md" | "lg" | "xl";
  replying?: boolean;
  className?: string;
};

const sizes = { sm: 40, md: 64, lg: 96, xl: 128 };

/** The coach's glowing orb. Decorative: the coach's name is always shown next to it. */
export function CoachAvatar({ coachId, size = "md", replying = false, className = "" }: Props) {
  const coach = getCoach(coachId);
  const style = { "--orb": coach.accent, "--orb-light": coach.secondary, "--orb-size": `${sizes[size]}px` } as CSSProperties;
  return <span aria-hidden="true" className={`coach-orb ${className}`} data-coach={coach.id} data-replying={replying || undefined} style={style} />;
}
