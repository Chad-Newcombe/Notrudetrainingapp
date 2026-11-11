import type { IntakeBrief } from "@/lib/intake";

export type EngagementTone = "gentle" | "steady" | "direct";
export type EngagementCadence = "brief" | "conversational" | "quiet";
export type MotivationStyle = "celebrate_wins" | "process_focus" | "accountability";
export type ChannelPref = "in_app" | "text_style" | "email_outline";
export type CoachId = "river" | "jax" | "sol" | "nova";
export type AppearanceMode = "system" | "light" | "dark";

export type SharedProfileFact = {
  id: string;
  category: "ability" | "constraint" | "schedule";
  statement: string;
  confirmedAt: string;
};

export type UserProfile = {
  goalText: string;
  intakeBrief?: IntakeBrief;
  currentWeightLbs?: number;
  targetWeightLbs?: number;
  targetDescription?: string;
  activityLevel?: string;
  constraints?: string;
  sharedFacts?: SharedProfileFact[];
  tone: EngagementTone;
  cadence: EngagementCadence;
  motivation: MotivationStyle;
  channels: ChannelPref[];
  trackWeight: boolean;
  coachId: CoachId;
  appearance?: AppearanceMode;
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

export type CoachConversationStatus = "active" | "archived";
export type ConversationResultLabel = string;

export type ConversationArchive = {
  title?: string;
  summary?: string;
  resultLabels: ConversationResultLabel[];
};

export type CoachConversation = {
  id: string;
  coachId: CoachId;
  status: CoachConversationStatus;
  messages: ChatMessage[];
  title?: string;
  summary?: string;
  resultLabels: ConversationResultLabel[];
  continuedFromId?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

export type CoachMemoryEntry = {
  id: string;
  key: string;
  value: string;
  evidence: string;
  learnedAt: string;
};

export type CoachRelationship = {
  coachId: CoachId;
  learnedPreferences: CoachMemoryEntry[];
  rejectedPatterns: string[];
  declinedSwitchSuggestion: boolean;
  updatedAt: string;
};

// Conversational evidence is private to its coach until a separate user confirmation.
export type SharedFactCandidate = {
  coachId: CoachId;
  category: SharedProfileFact["category"];
  statement: string;
  evidence: string;
};

export type CoachMemoryDelta = {
  coachId: CoachId;
  learnedPreferences?: Array<Pick<CoachMemoryEntry, "key" | "value" | "evidence">>;
  rejectedPatterns?: string[];
  declinedSwitchSuggestion?: boolean;
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
  fromCoachId: CoachId;
  direction: "coach_to_user";
  deliveredAt: string;
};
