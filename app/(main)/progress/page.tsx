export default function ProgressPage() {
  return (
    <main className="flex min-h-[60dvh] flex-col justify-center px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
        Progress
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
        History, streaks, and reflections will live here soon. Every session you
        log is already saved on this device.
      </p>
    </main>
  );
}
