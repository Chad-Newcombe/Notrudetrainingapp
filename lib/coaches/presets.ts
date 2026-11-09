import type {
  CoachId,
  EngagementCadence,
  EngagementTone,
  MotivationStyle,
} from "@/lib/types";

export type CoachPreset = {
  id: CoachId;
  name: string;
  vibe: string;
  accent: string;
  secondary: string;
  defaultTone: EngagementTone;
  defaultCadence: EngagementCadence;
  defaultMotivation: MotivationStyle;
  whyPrompts: {
    goal: string;
    now: string;
    target: string;
    engagement: string;
    channels: string;
  };
};

export const COACH_PRESETS: CoachPreset[] = [
  {
    id: "river",
    name: "River",
    vibe: "Calm trail buddy",
    accent: "#5b8c85",
    secondary: "#d7ebe6",
    defaultTone: "gentle",
    defaultCadence: "brief",
    defaultMotivation: "process_focus",
    whyPrompts: {
      goal: "Tell me the real goal in your words — I’ll build around that, not a generic template.",
      now: "A little context helps me meet you where you are. Skip anything that doesn’t feel useful.",
      target: "Only if you want a weight marker — plenty of people train without one.",
      engagement: "How should I show up day to day? We’ll tune this together.",
      channels: "Pick the kind of check-in you’d like to see in your Inbox.",
    },
  },
  {
    id: "jax",
    name: "Jax",
    vibe: "Upbeat accountability pal",
    accent: "#e2a03a",
    secondary: "#fff1d6",
    defaultTone: "steady",
    defaultCadence: "conversational",
    defaultMotivation: "celebrate_wins",
    whyPrompts: {
      goal: "What’s the win we’re chasing? Say it messy — I’ve got you.",
      now: "Where you’re starting matters. No judgment, just signal so I can help.",
      target: "Weight goals optional. If you track it, I’ll treat it gently.",
      engagement: "Pick the vibe that keeps you coming back — not the one that scolds.",
      channels: "A quick text or a bigger recap? Pick what you’d like in your Inbox.",
    },
  },
  {
    id: "sol",
    name: "Sol",
    vibe: "Warm direct coach",
    accent: "#c45c2a",
    secondary: "#fde6d8",
    defaultTone: "direct",
    defaultCadence: "brief",
    defaultMotivation: "accountability",
    whyPrompts: {
      goal: "Be clear about what you want. I’ll be clear about how we’ll start.",
      now: "Honest baseline beats a perfect story. Share what you can.",
      target: "If weight is part of the plan, say so. If not, we skip it.",
      engagement: "Choose how direct I should be — still kind, always.",
      channels: "Pick a short text or a fuller email for your Inbox. Both are optional.",
    },
  },
  {
    id: "nova",
    name: "Nova",
    vibe: "Curious spark-plug",
    accent: "#6b6fd6",
    secondary: "#e8e9ff",
    defaultTone: "steady",
    defaultCadence: "conversational",
    defaultMotivation: "celebrate_wins",
    whyPrompts: {
      goal: "What’s lighting you up? Ultra, habits, strength — I’m curious.",
      now: "Paint the starting line for me. Tiny details unlock better plans.",
      target: "Targets are tools, not verdicts. Optional always.",
      engagement: "How chatty / peppy should I be when we train together?",
      channels: "What feels right? A quick Inbox nudge, a weekly recap, or just chatting here?",
    },
  },
];

export function getCoach(id: CoachId | undefined | null): CoachPreset {
  return COACH_PRESETS.find((c) => c.id === id) ?? COACH_PRESETS[0]!;
}

export const DEFAULT_COACH_ID: CoachId = "river";
