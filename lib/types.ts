export type EngagementTone = "gentle" | "steady" | "direct";
export type EngagementCadence = "brief" | "conversational" | "quiet";
export type MotivationStyle = "celebrate_wins" | "process_focus" | "accountability";
export type ChannelPref = "in_app" | "text_style" | "email_outline";

export type UserProfile = {
  goalText: string;
  currentWeightLbs?: number;
  targetWeightLbs?: number;
  targetDescription?: string;
  activityLevel?: string;
  constraints?: string;
  tone: EngagementTone;
  cadence: EngagementCadence;
  motivation: MotivationStyle;
  channels: ChannelPref[];
  trackWeight: boolean;
  createdAt: string;
};

export type PlanSession = {
  id: string;
  dayIndex: number; // 0–6
  title: string;
  rationale: string; // why this fits their goal
  steps: { name: string; detail: string; durationMin?: number }[];
  intensity: "easy" | "moderate" | "hard";
};

export type TrainingPlan = {
  id: string;
  weekStartIso: string;
  sessions: PlanSession[];
  generatedFromGoal: string;
};

export type WorkoutLog = {
  id: string;
  sessionId: string;
  status: "completed" | "skipped" | "partial";
  notes?: string;
  completedAt: string;
};

export type ChatRole = "user" | "assistant" | "system";
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ProgressSnapshot = {
  id: string;
  type: "weight" | "checkin" | "reflection";
  value?: number;
  note?: string;
  createdAt: string;
};

export type HealthProviderId = "apple_health" | "strava" | "garmin";
export type HealthConnection = {
  provider: HealthProviderId;
  connected: boolean;
  lastSyncedAt?: string;
  sampleSummary?: string;
};

export type ComposedMessage = {
  id: string;
  channel: "text_style" | "email_outline";
  subject?: string;
  body: string;
  createdAt: string;
};
