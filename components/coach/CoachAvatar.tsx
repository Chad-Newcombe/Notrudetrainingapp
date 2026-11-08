import { getCoach, type CoachPreset } from "@/lib/coaches/presets";
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
  const coach = getCoach(coachId);
  const px = sizes[size];

  return (
    <div
      className={`coach-avatar relative shrink-0 ${className}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <CoachSvg coach={coach} />
    </div>
  );
}

function CoachSvg({ coach }: { coach: CoachPreset }) {
  const face =
    coach.id === "river"
      ? "#f3ebe1"
      : coach.id === "jax"
        ? "#f6d7b0"
        : coach.id === "sol"
          ? "#e8c4a8"
          : "#ddd6f5";

  return (
    <svg viewBox="0 0 96 96" className="h-full w-full overflow-visible">
      <defs>
        <clipPath id={`clip-${coach.id}`}>
          <circle cx="48" cy="48" r="44" />
        </clipPath>
      </defs>
      <circle cx="48" cy="48" r="46" fill={coach.secondary} />
      <g className="coach-bob" clipPath={`url(#clip-${coach.id})`}>
        <circle cx="48" cy="52" r="28" fill={face} />
        {/* hair / hat block */}
        <path
          d={
            coach.id === "river"
              ? "M20 44c4-18 52-18 56 0v8H20z"
              : coach.id === "jax"
                ? "M18 40c8-20 52-20 60 0l-4 10H22z"
                : coach.id === "sol"
                  ? "M22 38c10-16 42-16 52 0v12H22z"
                  : "M16 42c12-22 52-22 64 0v6H16z"
          }
          fill={coach.accent}
        />
        {/* eyes */}
        <circle cx="38" cy="52" r="3.2" fill="#1a1a1a" className="coach-blink" />
        <circle cx="58" cy="52" r="3.2" fill="#1a1a1a" className="coach-blink" />
        {/* smile */}
        <path
          d="M40 62c4 5 12 5 16 0"
          fill="none"
          stroke="#1a1a1a"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* accent cheek dots */}
        <circle cx="30" cy="58" r="2.5" fill={coach.accent} opacity="0.35" />
        <circle cx="66" cy="58" r="2.5" fill={coach.accent} opacity="0.35" />
      </g>
    </svg>
  );
}
