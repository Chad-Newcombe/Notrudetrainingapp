import { z } from "zod";
import { coachConversationSchema } from "@/lib/account/records";
import type { CoachConversation, CoachId } from "@/lib/types";
import { storageScope } from "./storage";

export type SessionJournalEntry = {
  coachId: CoachId;
  // Full records exist only while active or awaiting exact remote synchronization.
  conversation?: CoachConversation;
  syncPending: boolean;
  deleted?: boolean;
  processingPending?: boolean;
  evidence?: string[];
};
const schema = z.object({
  coachId: z.enum(["river", "jax", "sol", "nova", "knox", "riff"]).optional(),
  conversation: coachConversationSchema.optional(),
  syncPending: z.boolean(), deleted: z.boolean().optional(), processingPending: z.boolean().optional(),
  evidence: z.array(z.string().min(1).max(300)).max(8).optional(),
});

function compact(id: string, raw: unknown): SessionJournalEntry | undefined {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return;
  const entry = parsed.data;
  const coachId = entry.coachId ?? entry.conversation?.coachId;
  if (!coachId || (entry.conversation && (entry.conversation.id !== id || entry.conversation.coachId !== coachId))) return;
  if (entry.deleted) return { coachId, syncPending: true, deleted: true };
  const processing = entry.processingPending ? { processingPending: true, evidence: entry.evidence } : {};
  if (entry.syncPending) {
    if (!entry.conversation) return;
    return { coachId, conversation: entry.conversation, syncPending: true, ...processing };
  }
  if (entry.conversation?.status === "active") return { coachId, conversation: entry.conversation, syncPending: false, ...processing };
  if (entry.processingPending) return { coachId, syncPending: false, ...processing };
  // Successful archival/sync with no pending evidence processing needs no journal.
}

function store(entries: Record<string, SessionJournalEntry>, scope: string): void {
  const key = `notrude-coach-sessions:${scope}`;
  if (Object.keys(entries).length) localStorage.setItem(key, JSON.stringify(entries));
  else localStorage.removeItem(key);
}

export function readSessionJournal(scope = storageScope()): Record<string, SessionJournalEntry> {
  if (typeof localStorage === "undefined") return {};
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(localStorage.getItem(`notrude-coach-sessions:${scope}`) ?? "{}"); }
  catch { return {}; }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const entries: Record<string, SessionJournalEntry> = {};
  for (const [id, value] of Object.entries(raw)) {
    const entry = compact(id, value);
    if (entry) entries[id] = entry;
  }
  // Also compact snapshots written by the previous journal format.
  if (JSON.stringify(raw) !== JSON.stringify(entries)) store(entries, scope);
  return entries;
}

export function writeSessionJournal(id: string, entry: SessionJournalEntry | undefined, scope = storageScope()): void {
  if (typeof localStorage === "undefined") return;
  const entries = readSessionJournal(scope);
  const normalized = entry && compact(id, entry);
  if (normalized) entries[id] = normalized;
  else delete entries[id];
  store(entries, scope);
}
