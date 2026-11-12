import { coachConversationSchema } from "@/lib/account/records";
import type { CoachConversation } from "@/lib/types";
import { storageScope } from "./storage";

export type SessionJournalEntry = {
  conversation: CoachConversation;
  syncPending: boolean;
  deleted?: boolean;
  processingPending?: boolean;
  evidence?: string[];
};

// Account snapshots never share a key with guest data or another signed-in user.
export function readSessionJournal(scope = storageScope()): Record<string, SessionJournalEntry> {
  if (typeof localStorage === "undefined") return {};
  try {
    const data = JSON.parse(localStorage.getItem(`notrude-coach-sessions:${scope}`) ?? "{}");
    return Object.fromEntries(Object.entries(data).filter(([id, raw]) => {
      const entry = raw as SessionJournalEntry;
      const parsed = coachConversationSchema.safeParse(entry?.conversation);
      return parsed.success && parsed.data.id === id && typeof entry.syncPending === "boolean"
        && (entry.deleted === undefined || typeof entry.deleted === "boolean")
        && (entry.processingPending === undefined || typeof entry.processingPending === "boolean")
        && (entry.evidence === undefined || (Array.isArray(entry.evidence) && entry.evidence.length <= 8 && entry.evidence.every((text) => typeof text === "string" && text.length <= 300)));
    })) as Record<string, SessionJournalEntry>;
  } catch { return {}; }
}

export function writeSessionJournal(id: string, entry: SessionJournalEntry | undefined, scope = storageScope()): void {
  if (typeof localStorage === "undefined") return;
  const entries = readSessionJournal(scope);
  if (entry) entries[id] = entry;
  else delete entries[id];
  localStorage.setItem(`notrude-coach-sessions:${scope}`, JSON.stringify(entries));
}
