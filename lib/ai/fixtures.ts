import { createId } from "@/lib/ids";
import type {
  ChannelPref,
  ComposedMessage,
  PlanSession,
  TrainingPlan,
  UserProfile,
} from "@/lib/types";

function weekStartIso(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

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
  const gentleLanguage = /lose|weight|begin|start/i.test(profile.goalText);
  const highWeight =
    profile.currentWeightLbs !== undefined && profile.currentWeightLbs >= 300;
  return gentleLanguage || highWeight;
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

export function fixtureAcknowledgment(profile: UserProfile): string {
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

export function fixtureCoachReply(userText: string, profile: UserProfile): string {
  const lower = userText.toLowerCase();
  if (/tired|exhausted|rough day|bad day/.test(lower)) {
    return "That sounds like a heavy day. Rest or a very easy walk both count. What would feel kind, not punishing, for the next hour?";
  }
  if (/pain|hurt|injury|sore/.test(lower)) {
    return "Thanks for saying that. Ease off intensity, try modifications, and if pain stays sharp or worsens, loop in a clinician. You are not failing by scaling back.";
  }
  if (/skipped|missed|didn't/.test(lower)) {
    return "Missing a session is normal life, not a character flaw. Want to pick one small win for tomorrow that still fits your goal?";
  }
  const brief =
    profile.cadence === "brief"
      ? "One clear next step beats a long lecture."
      : "Tell me more about what got in the way, and we will shape the next step together.";
  return `${brief} I am with you on “${profile.goalText}.” What feels realistic for today?`;
}

type ComposeChannel = Extract<ChannelPref, "text_style" | "email_outline">;

export function fixtureComposedMessage(
  channel: ComposeChannel,
  profile: UserProfile,
): ComposedMessage {
  const createdAt = new Date().toISOString();
  const goal = profile.goalText;

  if (channel === "email_outline") {
    return {
      id: createId(),
      channel: "email_outline",
      subject: "Your training week — gentle check-in",
      body: [
        "Hi,",
        "",
        `I put together a week that respects your goal: ${goal}.`,
        "",
        "Highlights:",
        "- Short sessions you can move or shorten without guilt",
        "- Recovery treated as part of progress, not a setback",
        "",
        "Reply if anything felt too much or too little—we can adjust.",
        "",
        "— Notrude",
      ].join("\n"),
      createdAt,
    };
  }

  return {
    id: createId(),
    channel: "text_style",
    body: `Quick nudge: one small session today still moves "${goal}" forward. You've got this—no pressure to be perfect.`,
    createdAt,
  };
}
