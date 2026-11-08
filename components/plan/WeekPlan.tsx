import { Button } from "@/components/ui/Button";
import { DAY_LABELS, dayIndexInPlanWeek } from "@/lib/dates";
import type { PlanSession, TrainingPlan } from "@/lib/types";

const ADJUST_PROMPT = encodeURIComponent("Please adjust my week");

type Props = {
  plan: TrainingPlan;
};

export function WeekPlan({ plan }: Props) {
  const todayIndex = dayIndexInPlanWeek(plan.weekStartIso);
  const sorted = [...plan.sessions].sort((a, b) => a.dayIndex - b.dayIndex);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
          Your week
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Built around: &ldquo;{plan.generatedFromGoal}&rdquo;
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {sorted.map((session) => (
          <li key={session.id}>
            <SessionCard
              session={session}
              highlight={session.dayIndex === todayIndex}
            />
          </li>
        ))}
      </ul>

      {sorted.length === 0 && (
        <p className="text-[var(--muted)]">
          No sessions in this week yet. Coach can help you shape one.
        </p>
      )}

      <Button
        href={`/coach?prompt=${ADJUST_PROMPT}`}
        variant="ghost"
        className="w-full"
      >
        Ask coach to adjust
      </Button>
    </div>
  );
}

function SessionCard({
  session,
  highlight,
}: {
  session: PlanSession;
  highlight: boolean;
}) {
  const day = DAY_LABELS[session.dayIndex] ?? `Day ${session.dayIndex + 1}`;

  return (
    <article
      className={`rounded-2xl p-4 ring-1 ${
        highlight
          ? "bg-[var(--accent-soft)] ring-[var(--accent)]/40"
          : "bg-[var(--surface)] ring-white/10"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[var(--muted)]">{day}</p>
        <span className="text-xs capitalize text-[var(--muted)]">
          {session.intensity}
        </span>
      </div>
      <h2 className="mt-1 font-medium text-[var(--ink)]">{session.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {session.rationale}
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {session.steps.length} step{session.steps.length === 1 ? "" : "s"}
      </p>
    </article>
  );
}
