export default function CoachPage() {
  return (
    <main className="flex min-h-[60dvh] flex-col justify-center px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
        Coach
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
        Your always-on training partner is coming in the next update. For now,
        keep following your plan — missed days never mean you fell behind.
      </p>
    </main>
  );
}
