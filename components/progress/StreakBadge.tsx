type Props = {
  streak: number;
};

export function StreakBadge({ streak }: Props) {
  const label =
    streak === 0
      ? "Ready when you are"
      : `${streak} day${streak === 1 ? "" : "s"} of showing up`;

  return (
    <div className="rounded-2xl bg-[var(--surface)] px-4 py-5 ring-1 ring-white/10">
      <p className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
        Streak
      </p>
      <p className="mt-2 font-display text-2xl font-medium text-[var(--ink)]">
        {label}
      </p>
      {streak === 0 && (
        <p className="mt-2 text-base text-[var(--muted)]">
          A streak is just a counter — skipping days is normal, not failure.
        </p>
      )}
    </div>
  );
}
