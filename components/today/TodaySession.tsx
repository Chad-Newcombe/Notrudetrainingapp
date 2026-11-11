import { CoachStage } from "@/components/coach/CoachStage";
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
        <CoachStage coachId={coach.id} label={`Today · ${coach.name}`}
          title={outsidePlanWeek ? "Week in the rearview" : "Rest day"}
          description={outsidePlanWeek
            ? "Your saved week is complete. Take a breath and check in when you’re ready."
            : "You have room to rest today."} />
        <CoachBubble coachId={coach.id}>{nudge}</CoachBubble>
        <Button href="/coach" variant="ghost" className="w-full">
          Chat with {coach.name}
        </Button>
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col gap-7">
      <CoachStage coachId={coach.id} label={`Today · ${session.intensity} effort`}
        title={session.title} description={session.rationale}>
        {loggedToday && <span className="mt-3 inline-flex rounded-full border border-black bg-[var(--voltage)] px-2 py-1 text-xs font-bold text-black">Workout logged</span>}
      </CoachStage>

      <CoachBubble coachId={coach.id}>{nudge}</CoachBubble>

      <div className="panel p-4">
        <h2 className="meta-label">Steps</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {session.steps.map((step, index) => (
            <li key={index} className="grid grid-cols-[1.75rem_1fr] items-start gap-3 text-[var(--ink)]">
              <span className="grid size-7 place-items-center rounded-sm border border-black bg-[var(--voltage)] text-xs font-bold text-black">{index + 1}</span>
              <div><span className="font-display font-semibold tracking-tight">
                {step.name}
              </span>
              <span className="text-[var(--muted)]"> — {step.detail}</span>
              {step.durationMin != null ? (
                <span className="text-sm text-[var(--muted)]">
                  {" "}
                  · ~{step.durationMin} min
                </span>
              ) : null}</div>
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
