type ProgressDotsProps = {
  total: number;
  current: number;
};

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div
      className="flex items-center justify-center gap-2"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 bg-[var(--accent)]"
              : i < current
                ? "w-2 bg-[var(--accent)]/50"
                : "w-2 bg-[var(--surface)] ring-1 ring-[var(--muted)]/25"
          }`}
        />
      ))}
    </div>
  );
}
