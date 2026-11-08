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
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          History
        </h2>
        <p className="mt-3 text-base text-[var(--muted)]">
          When you log a session, it will show up here — completed, partial, or
          skipped.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
        History
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {sorted.map((log) => (
          <li
            key={log.id}
            className="panel px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-[var(--ink)]">
                  {sessionTitle(plan, log.sessionId)}
                </p>
                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  {formatWhen(log.completedAt)}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm ${
                  log.status === "skipped"
                    ? "text-[var(--muted)]"
                    : "text-[var(--sage)]"
                }`}
              >
                {STATUS_LABEL[log.status]}
              </span>
            </div>
            {log.notes ? (
              <p className="mt-2 text-sm text-[var(--muted)]">{log.notes}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
