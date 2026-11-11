import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DAY_LABELS, dayIndexInPlanWeek } from "@/lib/dates";
import { sessionDurationMin, weeklyDurationMin } from "@/lib/plan/metrics";
import type { PlanSession, TrainingPlan, WorkoutLog } from "@/lib/types";

type Props = {
  plan: TrainingPlan;
  logs: WorkoutLog[];
};

function planDayDate(weekStartIso: string, dayIndex: number) {
  const date = new Date(weekStartIso);
  date.setDate(date.getDate() + dayIndex);
  return date;
}

function logForSession(logs: WorkoutLog[], sessionId: string) {
  return logs
    .filter((log) => log.sessionId === sessionId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
}

export function WeekPlan({ plan, logs }: Props) {
  const todayIndex = dayIndexInPlanWeek(plan.weekStartIso);
  const duration = weeklyDurationMin(plan);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="meta-label">Plan</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <h1 className="text-[2rem] font-bold tracking-[-0.045em] text-[var(--app-text)]">Your week</h1>
          {duration == null ? null : <p className="pb-1 text-sm font-semibold text-[var(--app-muted)]">{duration} min scheduled</p>}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--app-muted)]">Built around “{plan.generatedFromGoal}”</p>
      </header>

      <ol aria-label="This week schedule" className="overflow-hidden rounded-[var(--radius-panel)] bg-[var(--app-raised)] px-4">
        {DAY_LABELS.map((day, dayIndex) => {
          const session = plan.sessions.find((item) => item.dayIndex === dayIndex) ?? null;
          const log = session ? logForSession(logs, session.id) : undefined;
          return (
            <li key={day} className="border-b border-[var(--app-line)] last:border-0">
              <ScheduleRow
                day={day}
                date={planDayDate(plan.weekStartIso, dayIndex)}
                session={session}
                log={log}
                isToday={dayIndex === todayIndex}
              />
            </li>
          );
        })}
      </ol>

      <Button href="/coach" variant="ghost" className="w-full">Discuss changes with coach</Button>
    </div>
  );
}

function ScheduleRow({
  day,
  date,
  session,
  log,
  isToday,
}: {
  day: string;
  date: Date;
  session: PlanSession | null;
  log?: WorkoutLog;
  isToday: boolean;
}) {
  const duration = session ? sessionDurationMin(session) : null;

  return (
    <article className="grid min-h-[5.5rem] grid-cols-[3.25rem_1fr_auto] items-center gap-3 py-3">
      <div>
        <p className="text-[.68rem] font-semibold text-[var(--app-muted)]">{day}</p>
        <p className="mt-0.5 text-lg font-bold text-[var(--app-text)]">{date.getDate()}</p>
      </div>
      <div className="min-w-0">
        <h2 className={`truncate font-semibold ${session ? "text-[var(--app-text)]" : "text-[var(--app-muted)]"}`}>
          {session?.title ?? "Rest day"}
        </h2>
        {session ? (
          <p className="mt-1 text-xs capitalize text-[var(--app-muted)]">
            {[duration == null ? null : `${duration} min`, session.intensity].filter(Boolean).join(" · ")}
          </p>
        ) : (
          <p className="mt-1 text-xs text-[var(--app-muted)]">Recovery</p>
        )}
      </div>
      <div className="justify-self-end text-right">
        {log?.status === "completed" ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--app-complete)]"><Check size={14} aria-hidden="true" />Completed</span>
        ) : log?.status === "partial" ? (
          <span className="text-xs font-semibold text-[var(--app-accent)]">Partial</span>
        ) : log?.status === "skipped" ? (
          <span className="text-xs font-semibold text-[var(--app-muted)]">Skipped</span>
        ) : isToday ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--app-accent),transparent_82%)] px-2.5 py-1 text-xs font-semibold text-[var(--app-accent)]">Today</span>
        ) : session ? (
          <span className="block size-2.5 rounded-full bg-[var(--app-accent)]" aria-label="Scheduled" />
        ) : null}
      </div>
    </article>
  );
}
