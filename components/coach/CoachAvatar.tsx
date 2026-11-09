import Image from "next/image";
import type { CoachId } from "@/lib/types";

type Props = {
  coachId: CoachId;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: 40,
  md: 64,
  lg: 96,
};

export function CoachAvatar({ coachId, size = "md", className = "" }: Props) {
  const px = sizes[size];

  return (
    <Image
      src={`/coaches/${coachId}.webp`}
      alt=""
      width={px}
      height={px}
      unoptimized
      className={`shrink-0 rounded-full bg-[var(--surface)] object-contain ${className}`}
    />
  );
}
