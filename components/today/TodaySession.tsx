import { Check } from "lucide-react";
import { CoachBubble } from "@/components/coach/CoachBubble";
import { Button } from "@/components/ui/Button";
import { coachNudgeForTone } from "@/lib/coach-nudge";
import { getCoach } from "@/lib/coaches/presets";
import { DAY_LABELS, dayIndexInPlanWeek } from "@/lib/dates";
import { sessionMetrics } from "@/lib/plan/metrics";
import type { PlanSession, TrainingPlan, UserProfile, WorkoutLog } from "@/lib/types";

type Props = {
  session: PlanSession | null;
  plan: TrainingPlan;
  logs: WorkoutLog[];
  profile: UserProfile;
  loggedToday?: boolean;
  outsidePlanWeek?: boolean;
};

function planDayDate(weekStartIso: string, dayIndex: number) {
  const date = new Date(weekStartIso);
  date.setDate(date.getDate() + dayIndex);
  return date;
}

function WeekStrip({ plan, logs }: { plan: TrainingPlan; logs: WorkoutLog[] }) {
  const todayIndex = dayIndexInPlanWeek(plan.weekStartIso);
  const completedIds = new Set(
    logs.filter((log) => log.status === "completed" || log.status === "partial").map((log) => log.sessionId),
  );

  return (
    <ol aria-label="Week at a glance" className="grid grid-cols-7 gap-1.5">
      {DAY_LABELS.map((day, dayIndex) => {
        const scheduled = plan.sessions.find((item) => item.dayIndex === dayIndex);
        const completed = scheduled ? completedIds.has(scheduled.id) : false;
        const isToday = dayIndex === todayIndex;
        const date = planDayDate(plan.weekStartIso, dayIndex);
        return (
          <li
            key={day}
            aria-current={isToday ? "date" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center rounded-xl text-center ${
              isToday ? "bg-[var(--app-accent)] text-[var(--app-on-accent)]" : "text-[var(--app-muted)]"
            }`}
          >
            <span className="text-[.66rem] font-semibold">{day.slice(0, 1)}</span>
            <span className="mt-0.5 text-sm font-semibold">{date.getDate()}</span>
            <span
              className={`mt-1 size-1.5 rounded-full ${
                completed
                  ? "bg-[var(--app-complete)]"
                  : scheduled
                    ? isToday ? "bg-[var(--app-on-accent)]" : "bg-[var(--app-accent)]"
                    : "bg-transparent"
              }`}
              aria-hidden="true"
            />
          </li>
        );
      })}
    </ol>
  );
}

export function TodaySession({
  session,
  plan,
  logs,
  profile,
  loggedToday,
  outsidePlanWeek,
}: Props) {
  const coach = getCoach(profile.coachId);
  const nudge = coachNudgeForTone(profile.tone);

  if (!session) {
    return (
      <div className="flex flex-col gap-7">
        <header>
          <p className="meta-label">Today</p>
          <h1 className="mt-2 text-[2rem] font-bold tracking-[-0.045em] text-[var(--app-text)]">
            {outsidePlanWeek ? "Week complete" : "Rest day"}
          </h1>
          <p className="mt-2 text-[var(--app-muted)]">
            {outsidePlanWeek
              ? "Your saved week is complete. Check in when you’re ready to shape what comes next."
              : "Recovery is part of the plan. There’s nothing to make up today."}
          </p>
        </header>
        <WeekStrip plan={plan} logs={logs} />
        <aside aria-label="Coach note"><CoachBubble coachId={coach.id}>{nudge}</CoachBubble></aside>
        <Button href="/coach" variant="ghost" className="w-full">Chat with {coach.name}</Button>
      </div>
    );
  }

  const metrics = sessionMetrics(session);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="meta-label">Today</p>
          <p className="mt-1 text-sm text-[var(--app-muted)]">{DAY_LABELS[session.dayIndex]}</p>
        </div>
        {loggedToday ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--app-complete),transparent_82%)] px-3 py-1.5 text-xs font-semibold text-[var(--app-complete)]">
            <Check size={14} aria-hidden="true" /> Logged
          </span>
        ) : null}
      </header>

      <WeekStrip plan={plan} logs={logs} />

      <article className="rounded-[var(--radius-panel)] bg-[var(--app-raised)] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--app-text),transparent_92%)]">
        <p className="text-sm font-semibold capitalize text-[var(--app-accent)]">{session.intensity} session</p>
        <h1 className="mt-2 text-[2rem] font-bold leading-[1.08] tracking-[-0.045em] text-[var(--app-text)]">
          {session.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--app-muted)]">{session.rationale}</p>

        <dl className="mt-5 grid grid-cols-3 gap-2 border-y border-[var(--app-line)] py-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="min-w-0">
              <dt className="text-[.7rem] text-[var(--app-muted)]">{metric.label}</dt>
              <dd className="mt-1 text-base font-bold text-[var(--app-text)]">{metric.value}</dd>
            </div>
          ))}
        </dl>

        <ol className="mt-5 flex flex-col gap-3">
          {session.steps.map((step, index) => (
            <li key={`${step.name}-${index}`} className="grid grid-cols-[1.5rem_1fr] gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-[var(--app-raised-strong)] text-xs font-semibold text-[var(--app-muted)]">{index + 1}</span>
              <div>
                <p className="font-semibold text-[var(--app-text)]">{step.name}</p>
                <p className="mt-0.5 text-sm text-[var(--app-muted)]">
                  {step.detail}{step.durationMin == null ? "" : ` · ${step.durationMin} min`}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <Button href={`/workout/${session.id}`} className="mt-6 w-full">
          {loggedToday ? "Review workout" : "Start workout"}
        </Button>
      </article>

      <aside aria-label="Coach note"><CoachBubble coachId={coach.id}>{nudge}</CoachBubble></aside>
    </div>
  );
}
