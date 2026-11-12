import type { TrainingPlan, WorkoutLog } from "@/lib/types";

type Props = {
  logs: WorkoutLog[];
  plan: TrainingPlan | null;
};

const STATUS_LABEL: Record<WorkoutLog["status"], string> = {
  completed: "Completed",
  partial: "Partial",
  skipped: "Skipped",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function sessionTitle(plan: TrainingPlan | null, sessionId: string): string {
  const session = plan?.sessions.find((s) => s.id === sessionId);
  return session?.title ?? "Workout";
}

export function HistoryList({ logs, plan }: Props) {
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold text-[var(--app-text)]">
          History
        </h2>
        <p className="mt-3 text-base text-[var(--app-muted)]">
          When you log a session, it will show up here — completed, partial, or
          skipped.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-[var(--app-text)]">
        History
      </h2>
      <ul className="mt-3 overflow-hidden rounded-[var(--radius-panel)] bg-[var(--app-raised)] px-4">
        {sorted.map((log) => (
          <li
            key={log.id}
            className="border-b border-[var(--app-line)] py-4 last:border-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--app-text)]">
                  {sessionTitle(plan, log.sessionId)}
                </p>
                <p className="mt-0.5 text-sm text-[var(--app-muted)]">
                  {formatWhen(log.completedAt)}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm ${
                  log.status === "skipped"
                    ? "text-[var(--app-muted)]"
                    : "text-[var(--app-complete)]"
                }`}
              >
                {STATUS_LABEL[log.status]}
              </span>
            </div>
            {log.notes ? (
              <p className="mt-2 text-sm text-[var(--app-muted)]">{log.notes}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
