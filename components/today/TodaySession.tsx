import { CoachBubble } from "@/components/coach/CoachBubble";
import { Button } from "@/components/ui/Button";
import { coachNudgeForTone } from "@/lib/coach-nudge";
import { getCoach } from "@/lib/coaches/presets";
import type { PlanSession, UserProfile } from "@/lib/types";

type Props = {
  session: PlanSession | null;
  profile: UserProfile;
  loggedToday?: boolean;
  outsidePlanWeek?: boolean;
};

export function TodaySession({
  session,
  profile,
  loggedToday,
  outsidePlanWeek,
}: Props) {
  const coach = getCoach(profile.coachId);
  const nudge = coachNudgeForTone(profile.tone);

  if (!session) {
    return (
      <div className="page-enter flex flex-col gap-7">
        <div>
          <p className="meta-label">Today</p>
          <h1 className="mt-2 font-display text-[1.75rem] font-semibold tracking-[-0.035em] text-[var(--ink)]">
            {outsidePlanWeek ? "Week in the rearview" : "Rest day"}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
            {outsidePlanWeek
              ? "This saved week has ended. The trail can wait — breathe, then build a fresh week when you’re ready."
              : "Nothing scheduled. The trail can wait — today is for easy breath."}
          </p>
        </div>
        <CoachBubble coachId={coach.id}>{nudge}</CoachBubble>
        <Button href="/coach" variant="ghost" className="w-full">
          Chat with {coach.name}
        </Button>
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col gap-7">
      <div>
        <p className="meta-label">Today</p>
        <h1 className="mt-2 font-display text-[1.75rem] font-semibold tracking-[-0.035em] text-[var(--ink)]">
          {session.title}
        </h1>
        {loggedToday ? (
          <p className="mt-2 text-sm font-medium text-[var(--sage)]">
            Already logged — showing up counts.
          </p>
        ) : null}
      </div>

      <p className="text-lg leading-relaxed text-[var(--ink-soft)]">
        {session.rationale}
      </p>

      <CoachBubble coachId={coach.id}>{nudge}</CoachBubble>

      <div className="panel p-4">
        <h2 className="meta-label">Steps</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {session.steps.map((step, index) => (
            <li key={index} className="text-[var(--ink)]">
              <span className="font-display font-semibold tracking-tight">
                {step.name}
              </span>
              <span className="text-[var(--muted)]"> — {step.detail}</span>
              {step.durationMin != null ? (
                <span className="text-sm text-[var(--muted)]">
                  {" "}
                  · ~{step.durationMin} min
                </span>
              ) : null}
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
