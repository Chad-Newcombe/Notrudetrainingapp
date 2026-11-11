type Props = {
  streak: number;
};

export function StreakBadge({ streak }: Props) {
  return (
    <section className="rounded-[var(--radius-panel)] bg-[var(--app-raised)] p-5">
      <p className="text-sm font-semibold text-[var(--app-muted)]">Current streak</p>
      <div className="mt-3 flex items-end gap-2">
        <p className="text-[3rem] font-bold leading-none tracking-[-0.055em] text-[var(--app-text)]">{streak}</p>
        <p className="pb-1 text-sm font-semibold text-[var(--app-muted)]">day{streak === 1 ? "" : "s"}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--app-muted)]">
        {streak === 0
          ? "Ready when you are — a streak is just a counter, not a verdict."
          : `${streak} day${streak === 1 ? "" : "s"} of showing up. Nice.`}
      </p>
    </section>
  );
}
