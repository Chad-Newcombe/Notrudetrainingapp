import { z } from "zod";
import { intakeBriefSchema } from "@/lib/intake";

const id = z.string().min(1).max(200);
const text = z.string().max(24_000);
const stamp = z.string().min(1).max(80);
const coach = z.enum(["river", "jax", "sol", "nova"]);
const provider = z.enum(["apple_health", "strava", "garmin"]);
const profile = z.object({
  goalText: text,
  intakeBrief: intakeBriefSchema.optional(),
  currentWeightLbs: z.number().finite().optional(),
  targetWeightLbs: z.number().finite().optional(),
  targetDescription: text.optional(),
  activityLevel: text.optional(),
  constraints: text.optional(),
  tone: z.enum(["gentle", "steady", "direct"]),
  cadence: z.enum(["brief", "conversational", "quiet"]),
  motivation: z.enum(["celebrate_wins", "process_focus", "accountability"]),
  channels: z.array(z.enum(["in_app", "text_style", "email_outline"])).max(3),
  trackWeight: z.boolean(),
  coachId: coach.optional(),
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
  chat: z.object({
    id, role: z.enum(["user", "assistant", "system"]), content: text, createdAt: stamp,
  }),
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

export const collections = ["meta", "logs", "chat", "progress", "health", "messages"] as const;
export type Collection = (typeof collections)[number];
export const collectionSchema = z.enum(collections);
export const recordSchema = z.object({ collection: collectionSchema, key: id, value: z.unknown() });
export type StoredRecord = z.infer<typeof recordSchema>;

export function parseRecord(record: StoredRecord) {
  const { collection, key, value } = record;
  if (collection === "meta") {
    const schema = key === "profile" ? profile : key === "plan" ? plan : null;
    const parsed = schema?.safeParse(value);
    return parsed?.success ? { ...record, value: parsed.data } : null;
  }

  const parsed = schemas[collection].safeParse(value);
  if (!parsed.success) return null;
  const recordKey = "provider" in parsed.data ? parsed.data.provider : parsed.data.id;
  return recordKey === key ? { ...record, value: parsed.data } : null;
}
