type ProgressDotsProps = {
  total: number;
  current: number;
};

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i === current
              ? "w-7 bg-[var(--ink-strong)]"
              : i < current
                ? "w-4 bg-[var(--ink-strong)]/35"
                : "w-4 bg-[var(--hairline)]"
          }`}
        />
      ))}
    </div>
  );
}
