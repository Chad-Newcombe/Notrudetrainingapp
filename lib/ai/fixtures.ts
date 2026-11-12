import { fixtureCoachFit, isExplicitStyleRequest } from "@/lib/coaches/fit";
import { getCoach } from "@/lib/coaches/presets";
import { classifyPlanIntent } from "@/lib/coach/plan-revision";
import type { CoachRelationship } from "@/lib/types";
import { weekStartIso } from "@/lib/dates";
import { createId } from "@/lib/ids";
import type {
  ChannelPref,
  ComposedMessage,
  PlanSession,
  TrainingPlan,
  UserProfile,
} from "@/lib/types";

function session(
  dayIndex: number,
  title: string,
  rationale: string,
  intensity: PlanSession["intensity"],
  steps: PlanSession["steps"],
): PlanSession {
  return { id: createId(), dayIndex, title, rationale, steps, intensity };
}

function isEnduranceGoal(goalText: string): boolean {
  return /ultra|marathon|race/i.test(goalText);
}

function isGentleGoal(profile: UserProfile): boolean {
  const weightLanguage = /lose|weight/i.test(profile.goalText);
  const highWeight =
    profile.currentWeightLbs !== undefined && profile.currentWeightLbs >= 300;
  return weightLanguage || highWeight || profile.trackWeight;
}

function enduranceSessions(profile: UserProfile): PlanSession[] {
  const goal = profile.goalText;
  return [
    session(
      1,
      "Easy recovery walk",
      `Keeps blood moving without taxing you while you build toward "${goal}".`,
      "easy",
      [
        { name: "Warm-up", detail: "5 minutes at an easy pace", durationMin: 5 },
        { name: "Steady walk", detail: "25–35 minutes conversational", durationMin: 30 },
      ],
    ),
    session(
      3,
      "Endurance hike or run",
      `Longer aerobic time supports your endurance goal: ${goal}.`,
      "moderate",
      [
        { name: "Easy start", detail: "10 minutes easy", durationMin: 10 },
        { name: "Steady block", detail: "40 minutes run/walk by feel", durationMin: 40 },
        { name: "Cool-down", detail: "5 minutes walk", durationMin: 5 },
      ],
    ),
    session(
      5,
      "Strength for runners",
      `Light strength protects joints on the way to your race or ultra.`,
      "moderate",
      [
        { name: "Squats", detail: "2×12 bodyweight or supported", durationMin: 10 },
        { name: "Single-leg balance", detail: "30 seconds each side", durationMin: 5 },
      ],
    ),
    session(
      0,
      "Rest or gentle mobility",
      "Recovery is part of endurance—no guilt for an off day.",
      "easy",
      [{ name: "Stretch", detail: "10 minutes hips and calves", durationMin: 10 }],
    ),
  ];
}

function gentleSessions(profile: UserProfile): PlanSession[] {
  const goal = profile.goalText;
  return [
    session(
      1,
      "Mobility and breathing",
      `A calm start that honors "${goal}" without pushing too hard.`,
      "easy",
      [
        { name: "Breathing", detail: "2 minutes slow inhales", durationMin: 2 },
        { name: "Joint circles", detail: "Ankles, hips, shoulders", durationMin: 8 },
      ],
    ),
    session(
      3,
      "Easy walk",
      "Walking builds consistency and feels doable at your current weight and energy.",
      "easy",
      [
        { name: "Warm-up", detail: "3 minutes indoors if needed", durationMin: 3 },
        { name: "Walk", detail: "15–20 minutes at a pace you can talk", durationMin: 18 },
      ],
    ),
    session(
      5,
      "Gentle full-body movement",
      "Light strength supports weight goals without intensity spikes.",
      "moderate",
      [
        { name: "Chair squats", detail: "2×8 controlled", durationMin: 8 },
        { name: "Wall push-ups", detail: "2×8", durationMin: 6 },
      ],
    ),
    session(
      6,
      "Optional stretch walk",
      "Move if it helps; skip without shame if you need rest.",
      "easy",
      [{ name: "Walk + stretch", detail: "10 minutes total", durationMin: 10 }],
    ),
  ];
}

function mixedSessions(profile: UserProfile): PlanSession[] {
  const goal = profile.goalText;
  return [
    session(
      1,
      "Consistency walk",
      `A simple session aligned with staying steady on: ${goal}.`,
      "easy",
      [{ name: "Walk", detail: "20 minutes", durationMin: 20 }],
    ),
    session(
      3,
      "Mixed movement",
      "Blend cardio and mobility for a balanced week.",
      "moderate",
      [
        { name: "Warm-up walk", detail: "5 minutes", durationMin: 5 },
        { name: "Bodyweight circuit", detail: "2 rounds easy pace", durationMin: 15 },
      ],
    ),
    session(
      5,
      "Active recovery",
      "Light activity keeps the habit without overreaching.",
      "easy",
      [{ name: "Yoga or stretch", detail: "15 minutes", durationMin: 15 }],
    ),
  ];
}

export function fixturePlanForProfile(profile: UserProfile): TrainingPlan {
  let sessions: PlanSession[];
  if (isEnduranceGoal(profile.goalText)) {
    sessions = enduranceSessions(profile);
  } else if (isGentleGoal(profile)) {
    sessions = gentleSessions(profile);
  } else {
    sessions = mixedSessions(profile);
  }

  return {
    id: createId(),
    weekStartIso: weekStartIso(),
    sessions,
    generatedFromGoal: profile.goalText,
  };
}

export function fixtureReflection(profile: UserProfile): string {
  const snippet =
    profile.goalText.length > 80
      ? `${profile.goalText.slice(0, 77)}…`
      : profile.goalText;
  return `Looking back at your week: your goal—“${snippet}”—still guides you. Whatever you did or skipped, you are allowed to reset without shame. What felt like progress, even if small?`;
}

export function fixtureAcknowledgment(profile: UserProfile): string {
  if (profile.intakeBrief) {
    return "Your coaching notes are saved. You can revisit them anytime under More.";
  }

  const snippet =
    profile.goalText.length > 80
      ? `${profile.goalText.slice(0, 77)}…`
      : profile.goalText;
  const tone =
    profile.tone === "direct"
      ? "Here is the honest take:"
      : profile.tone === "steady"
        ? "Taking it one step at a time:"
        : "Glad you are here.";
  return `${tone} Your goal—“${snippet}”—matters, and showing up in any amount counts. Nothing about today needs to be perfect.`;
}

export function fixtureCoachReply(userText: string, profile: UserProfile, relationship?: CoachRelationship | null): string {
  const lower = userText.toLowerCase();
  const coach = profile.coachId ?? "river";
  const declined = relationship?.coachId === coach && relationship.declinedSwitchSuggestion;
  const fit = fixtureCoachFit(userText, coach, declined);
  const situation = /pain|hurt|injury|sore/.test(lower) ? "pain"
    : classifyPlanIntent(userText) === "explicit" ? "plan"
      : /stop reassuring|no reassurance|less reassurance/.test(lower) ? "reassurance"
        : isExplicitStyleRequest(userText) ? "style"
          : /tired|exhausted|rough day|bad day/.test(lower) ? "tired"
            : /skipped|missed|didn't/.test(lower) ? "missed" : "general";
  const day = userText.match(/\b(?:to|on|for)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[1];
  const when = day ? day[0].toUpperCase() + day.slice(1).toLowerCase() : "your requested schedule";
  const replies = {
    river: {
      pain: "Ease off today. If the pain is sharp or keeps returning, check with a clinician.",
      tired: "Keep today small: five easy minutes, or rest if that fits better.",
      missed: "Leave some room for one short session tomorrow. The missed workout can stay behind you.",
      general: "Start with one manageable step today. Keep the pace comfortable.",
      plan: `Use ${when} for the change you requested. The plan update will show below once saved.`,
      reassurance: "I'll keep reassurance out and focus on one manageable action.",
      style: "I can be firmer and keep the next decision simple, with the choice still yours.",
    },
    jax: {
      pain: "Back off the intensity. If pain sticks around or gets worse, check with a clinician.",
      tired: "Keep it short today: five easy minutes is enough to get moving.",
      missed: "Pick the next workable slot and get moving again. One short session is enough to restart.",
      general: "Put one practical move on today's schedule. Make it small enough to follow through.",
      plan: `Let's work with ${when}. You'll see the change below when the plan is saved.`,
      reassurance: "I'll skip the reassurance and get straight to the practical next move.",
      style: "I'll keep the energy practical and focus on following through, without turning up the pressure.",
    },
    sol: {
      pain: "Stop the painful movement. If pain persists or worsens, get it checked by a clinician.",
      tired: "Scale today down to five easy minutes, or rest if you need it.",
      missed: "Leave the missed session behind. Choose one realistic slot tomorrow.",
      general: "Choose one realistic action for today and give it a time.",
      plan: `Make the change for ${when}. The saved result will appear below.`,
      reassurance: "I'll lead with the recommendation and leave out reassurance.",
      style: "I'll give you a clear recommendation and expect a realistic commitment, without pressure or shaming.",
    },
    nova: {
      pain: "Skip the painful move. If pain lingers, ask a clinician.",
      tired: "Try a five-minute version today and notice whether it leaves you more settled.",
      missed: "Test a shorter version at your next available slot. Use how it fits to shape the next session.",
      general: "Try the smallest useful version today and notice what makes it easier to repeat.",
      plan: `Try ${when} as requested. The saved update below will make the new arrangement visible.`,
      reassurance: "I'll drop reassurance and focus on practical tests with a clear purpose.",
      style: "I'll make the experiment more decisive and keep it practical, without turning coaching into pressure.",
    },
  };
  return fit && situation === "style" ? `${getCoach(fit.coachId).name} may fit that style better. ${replies[coach].style}` : replies[coach][situation];
}

type ComposeChannel = Extract<ChannelPref, "text_style" | "email_outline">;

export function fixtureComposedMessage(
  channel: ComposeChannel,
  profile: UserProfile,
): ComposedMessage {
  const createdAt = new Date().toISOString();
  const goal = profile.goalText;

  const coachId = profile.coachId ?? "river";
  const coachName =
    coachId === "jax"
      ? "Jax"
      : coachId === "sol"
        ? "Sol"
        : coachId === "nova"
          ? "Nova"
          : "River";
  const deliveredAt = createdAt;

  if (channel === "email_outline") {
    return {
      id: createId(),
      channel: "email_outline",
      subject: `From ${coachName}: your week check-in`,
      body: [
        "Hey,",
        "",
        `It’s ${coachName}. I shaped a week around your goal: ${goal}.`,
        "",
        "Highlights:",
        "- Short sessions you can move or shorten without guilt",
        "- Recovery treated as part of progress, not a setback",
        "",
        "Reply in the app if anything felt too much or too little — we’ll adjust.",
        "",
        `— ${coachName}`,
      ].join("\n"),
      createdAt,
      fromCoachId: coachId,
      direction: "coach_to_user",
      deliveredAt,
    };
  }

  return {
    id: createId(),
    channel: "text_style",
    body: `${coachName} here — one small session today still moves “${goal}” forward. Keep it manageable.`,
    createdAt,
    fromCoachId: coachId,
    direction: "coach_to_user",
    deliveredAt,
  };
}
