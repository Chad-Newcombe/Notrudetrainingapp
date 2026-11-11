import Image from "next/image";
import type { CoachId } from "@/lib/types";

type Props = {
  coachId: CoachId;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizes = {
  sm: 40,
  md: 64,
  lg: 96,
  xl: 280,
};

export function CoachAvatar({ coachId, size = "md", className = "" }: Props) {
  const px = sizes[size];

  return (
    <Image
      src={`/coaches/${coachId}-editorial.png`}
      alt=""
      width={px}
      height={px}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
