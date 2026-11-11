import { z } from "zod";
import { intakeBriefSchema } from "@/lib/intake";

const id = z.string().min(1).max(200);
const text = z.string().max(24_000);
const stamp = z.string().min(1).max(80);
const coach = z.enum(["river", "jax", "sol", "nova"]);
const provider = z.enum(["apple_health", "strava", "garmin"]);
const message = z.object({
  id, role: z.enum(["user", "assistant", "system"]), content: text, createdAt: stamp,
});
export const coachConversationSchema = z.object({
  id, coachId: coach, status: z.enum(["active", "archived"]),
  messages: z.array(message).max(3000), title: text.optional(), summary: text.optional(),
  resultLabels: z.array(text).max(100), continuedFromId: id.optional(),
  createdAt: stamp, updatedAt: stamp, archivedAt: stamp.optional(),
}).refine((value) => value.status === "archived" || value.messages.length <= 200, {
  message: "Active conversations may contain at most 200 messages.", path: ["messages"],
});
const memoryText = z.string().min(1).max(300);
export const coachRelationshipSchema = z.object({
  coachId: coach,
  learnedPreferences: z.array(z.object({
    id, key: memoryText, value: memoryText, evidence: memoryText, learnedAt: stamp,
  })).max(200),
  rejectedPatterns: z.array(memoryText).max(200),
  declinedSwitchSuggestion: z.boolean(), updatedAt: stamp,
});
const profile = z.object({
  goalText: text,
  intakeBrief: intakeBriefSchema.optional(),
  currentWeightLbs: z.number().finite().optional(),
  targetWeightLbs: z.number().finite().optional(),
  targetDescription: text.optional(),
  activityLevel: text.optional(),
  constraints: text.optional(),
  sharedFacts: z.array(z.object({
    id, category: z.enum(["ability", "constraint", "schedule"]),
    statement: z.string().min(1).max(220), confirmedAt: stamp,
  })).max(200).optional(),
  tone: z.enum(["gentle", "steady", "direct"]),
  cadence: z.enum(["brief", "conversational", "quiet"]),
  motivation: z.enum(["celebrate_wins", "process_focus", "accountability"]),
  channels: z.array(z.enum(["in_app", "text_style", "email_outline"])).max(3),
  trackWeight: z.boolean(),
  coachId: coach.optional(),
  appearance: z.enum(["system", "light", "dark"]).optional(),
  createdAt: stamp,
});
const plan = z.object({
  id, weekStartIso: stamp, generatedFromGoal: text,
  sessions: z.array(z.object({
    id,
    dayIndex: z.number().int().min(0).max(6),
    title: text,
    rationale: text,
    steps: z.array(z.object({ name: text, detail: text, durationMin: z.number().finite().optional() })).max(100),
    intensity: z.enum(["easy", "moderate", "hard"]),
  })).max(50),
});
const schemas = {
  logs: z.object({
    id, sessionId: id, status: z.enum(["completed", "skipped", "partial"]),
    notes: text.optional(), completedAt: stamp,
  }),
  chat: message,
  coachConversations: coachConversationSchema,
  coachRelationships: coachRelationshipSchema,
  progress: z.object({
    id, type: z.enum(["weight", "checkin", "reflection"]), value: z.number().finite().optional(),
    note: text.optional(), createdAt: stamp,
  }),
  health: z.object({
    provider, connected: z.boolean(), lastSyncedAt: stamp.optional(), sampleSummary: text.optional(),
  }),
  messages: z.object({
    id, channel: z.enum(["text_style", "email_outline"]), subject: text.optional(), body: text,
    createdAt: stamp, fromCoachId: coach.optional(), direction: z.literal("coach_to_user").optional(),
    deliveredAt: stamp.optional(),
  }),
};

export const collections = ["meta", "logs", "chat", "progress", "health", "messages", "coachConversations", "coachRelationships"] as const;
export type Collection = (typeof collections)[number];
export const collectionSchema = z.enum(collections);
export const recordSchema = z.object({ collection: collectionSchema, key: id, value: z.unknown() });
export type StoredRecord = z.infer<typeof recordSchema>;
export const COACH_MIGRATION_KEY = "coach-conversation-migration-v2";

export function canWriteRecord(current: unknown, record: StoredRecord): boolean {
  if (record.collection !== "coachConversations" || current === undefined) return true;
  const previous = coachConversationSchema.safeParse(current);
  const next = coachConversationSchema.safeParse(record.value);
  if (!previous.success || !next.success || previous.data.coachId !== next.data.coachId) return false;
  return previous.data.status !== "archived" || JSON.stringify(previous.data) === JSON.stringify(next.data);
}

export function validRecordKey(collection: Collection, key: string): boolean {
  if (!id.safeParse(key).success) return false;
  if (collection === "meta") return ["profile", "plan", "coach-conversation-migration-v2"].includes(key);
  if (collection === "coachRelationships") return coach.safeParse(key).success;
  if (collection === "health") return provider.safeParse(key).success;
  return true;
}

export function parseRecord(record: StoredRecord) {
  const { collection, key, value } = record;
  if (!collectionSchema.safeParse(collection).success || !validRecordKey(collection, key)) return null;
  if (collection === "meta") {
    const schema = key === "profile" ? profile : key === "plan" ? plan : z.literal(true);
    const parsed = schema?.safeParse(value);
    return parsed?.success ? { ...record, value: parsed.data } : null;
  }

  const parsed = schemas[collection].safeParse(value);
  if (!parsed.success) return null;
  const recordKey = "provider" in parsed.data ? parsed.data.provider
    : "id" in parsed.data ? parsed.data.id : parsed.data.coachId;
  return recordKey === key ? { ...record, value: parsed.data } : null;
}
