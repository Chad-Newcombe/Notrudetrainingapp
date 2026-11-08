import { Button } from "@/components/ui/Button";
import { coachNudgeForTone } from "@/lib/coach-nudge";
import type { PlanSession, UserProfile } from "@/lib/types";

type Props = {
  session: PlanSession | null;
  profile: UserProfile;
  loggedToday?: boolean;
};

export function TodaySession({ session, profile, loggedToday }: Props) {
  if (!session) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
            Rest day
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-[var(--muted)]">
            Nothing scheduled today. Recovery is part of training — no guilt
            needed.
          </p>
        </div>
        <p className="text-base text-[var(--ink)]">
          {coachNudgeForTone(profile.tone)}
        </p>
        <Button href="/coach" variant="ghost" className="w-full">
          Chat with Coach
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm uppercase tracking-wide text-[var(--muted)]">
          Today
        </p>
        <h1 className="mt-1 font-display text-2xl font-medium text-[var(--ink)]">
          {session.title}
        </h1>
        {loggedToday && (
          <p className="mt-2 text-sm text-[var(--accent)]">
            You already logged this one — nice work showing up.
          </p>
        )}
      </div>

      <p className="text-lg leading-relaxed text-[var(--ink)]">
        {session.rationale}
      </p>

      <p className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-base text-[var(--muted)] ring-1 ring-white/10">
        {coachNudgeForTone(profile.tone)}
      </p>

      <div className="rounded-2xl bg-[var(--surface)] p-4 ring-1 ring-white/10">
        <h2 className="text-sm font-medium text-[var(--muted)]">Steps</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {session.steps.map((step, index) => (
            <li key={index} className="text-[var(--ink)]">
              <span className="font-medium">{step.name}</span>
              <span className="text-[var(--muted)]"> — {step.detail}</span>
              {step.durationMin != null && (
                <span className="text-sm text-[var(--muted)]">
                  {" "}
                  · ~{step.durationMin} min
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <Button href={`/workout/${session.id}`} className="w-full">
        {loggedToday ? "Review workout" : "Start"}
      </Button>
    </div>
  );
}
