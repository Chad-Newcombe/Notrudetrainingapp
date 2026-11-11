import { Button } from "@/components/ui/Button";
import { DAY_LABELS, dayIndexInPlanWeek } from "@/lib/dates";
import type { PlanSession, TrainingPlan } from "@/lib/types";

type Props = {
  plan: TrainingPlan;
};

export function WeekPlan({ plan }: Props) {
  const todayIndex = dayIndexInPlanWeek(plan.weekStartIso);
  const sorted = [...plan.sessions].sort((a, b) => a.dayIndex - b.dayIndex);

  return (
    <div className="page-enter flex flex-col gap-7">
      <div>
        <p className="meta-label">Plan</p>
        <h1 className="mt-2 font-display text-[1.75rem] font-semibold tracking-[-0.035em] text-[var(--ink)]">
          Your week
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Built around: &ldquo;{plan.generatedFromGoal}&rdquo;
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {sorted.map((session) => (
          <li key={session.id}>
            <SessionRow
              session={session}
              highlight={session.dayIndex === todayIndex}
            />
          </li>
        ))}
      </ul>

      {sorted.length === 0 ? (
        <p className="text-[var(--muted)]">
          No sessions yet. Coach can help you sketch one.
        </p>
      ) : null}

      <Button
        href="/coach"
        variant="ghost"
        className="w-full"
      >
        Discuss changes with coach
      </Button>
    </div>
  );
}

function SessionRow({
  session,
  highlight,
}: {
  session: PlanSession;
  highlight: boolean;
}) {
  const day = DAY_LABELS[session.dayIndex] ?? `Day ${session.dayIndex + 1}`;

  return (
    <article
      className={`panel p-4 ${
        highlight ? "border-[var(--ink-strong)]" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="meta-label">{day}</p>
        <span className="text-xs capitalize text-[var(--muted)]">
          {session.intensity}
        </span>
      </div>
      <h2 className="mt-2 font-display text-base font-semibold tracking-tight text-[var(--ink)]">
        {session.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {session.rationale}
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {session.steps.length} step{session.steps.length === 1 ? "" : "s"}
      </p>
    </article>
  );
}
