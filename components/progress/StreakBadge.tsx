type Props = {
  streak: number;
};

export function StreakBadge({ streak }: Props) {
  return (
    <div>
      <p className="meta-label">Showing up</p>
      <p className="mt-2 font-display text-[2.75rem] font-semibold leading-none tracking-[-0.05em] text-[var(--ink)]">
        {streak}
      </p>
      <p className="mt-2 text-base text-[var(--muted)]">
        {streak === 0
          ? "Ready when you are — a streak is just a counter, not a verdict."
          : `${streak} day${streak === 1 ? "" : "s"} of showing up. Nice.`}
      </p>
    </div>
  );
}
