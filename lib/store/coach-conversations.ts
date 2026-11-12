import { canWriteRecord, coachConversationSchema } from "@/lib/account/records";
import { archiveConversation, conversationsForCoach, newCoachConversation, shouldDiscardConversation, withConversationMessages } from "@/lib/coach/conversations";
import { conversationArchiveSchema, fallbackConversationArchive } from "@/lib/coach/archive";
import { applyMemoryDelta } from "@/lib/coaches/relationship";
import type { ChatMessage, CoachConversation, CoachId, CoachMemoryDelta } from "@/lib/types";
import { storageGeneration } from "./db";
import { emptyCoachRelationship, getCoachRelationship } from "./coach-relationships";
import { readSessionJournal, writeSessionJournal } from "./coach-session-journal";
import { AccountStorageError, deleteRecord, readRecord, readRecords, storageScope, writeRecord, writeRecords } from "./storage";

function changed() { if (typeof window !== "undefined") window.dispatchEvent(new Event("notrude-coach-conversations")); }
function assertScope(scope: string) { if (storageScope() !== scope) throw new Error("Storage account changed."); }

export async function listCoachConversations(coachId?: CoachId): Promise<CoachConversation[]> {
  const scope = storageScope();
  const local = readSessionJournal(scope);
  let records: CoachConversation[];
  let offline = false;
  try { records = await readRecords("coachConversations"); }
  catch (error) { if (!Object.keys(local).length) throw error; records = []; offline = true; }
  assertScope(scope);
  const merged = new Map(records.map((record) => [record.id, record]));
  for (const entry of Object.values(local)) {
    if (entry.deleted) merged.delete(entry.conversation.id);
    else if (entry.syncPending || offline) merged.set(entry.conversation.id, entry.conversation);
  }
  return coachId === undefined ? [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : conversationsForCoach([...merged.values()], coachId);
}

export async function getCoachConversation(id: string): Promise<CoachConversation | undefined> {
  const scope = storageScope();
  const cached = readSessionJournal(scope)[id];
  if (cached?.deleted) return undefined;
  if (cached?.syncPending) return cached.conversation;
  try {
    const record = await readRecord("coachConversations", id);
    assertScope(scope);
    if (record?.status === "active" && scope !== "guest") writeSessionJournal(id, { ...cached, conversation: record, syncPending: false }, scope);
    if (!record && cached) writeSessionJournal(id, undefined, scope);
    return record;
  } catch (error) { assertScope(scope); if (cached) return cached.conversation; throw error; }
}

export async function saveCoachConversation(value: CoachConversation): Promise<void> {
  const generation = storageGeneration();
  const parsed = coachConversationSchema.parse(value);
  const scope = storageScope();
  const previous = await getCoachConversation(parsed.id);
  assertScope(scope);
  if (generation !== storageGeneration()) return;
  if (!canWriteRecord(previous, { collection: "coachConversations", key: parsed.id, value: parsed })) throw new Error("Conversation is immutable or belongs to another coach.");
  const oldEntry = readSessionJournal(scope)[parsed.id];
  const entry = { ...oldEntry, conversation: parsed, syncPending: scope !== "guest" };
  // A synchronous durable snapshot precedes every account/network write.
  writeSessionJournal(parsed.id, entry, scope);
  try {
    await writeRecord("coachConversations", parsed.id, parsed);
    assertScope(scope);
    if (generation === storageGeneration()) writeSessionJournal(parsed.id, { ...entry, syncPending: false }, scope);
  } catch (error) {
    if (scope === "guest" || typeof localStorage === "undefined" || (error instanceof AccountStorageError && error.status < 500)) {
      writeSessionJournal(parsed.id, oldEntry, scope);
      throw error;
    }
    // Account operations retry from the account-scoped journal on reconnect.
  }
  changed();
}

export async function deleteCoachConversation(id: string): Promise<void> {
  const scope = storageScope();
  const previous = await getCoachConversation(id);
  assertScope(scope);
  const oldEntry = readSessionJournal(scope)[id];
  if (scope !== "guest" && previous) writeSessionJournal(id, { conversation: previous, syncPending: true, deleted: true }, scope);
  try {
    await deleteRecord("coachConversations", id);
    writeSessionJournal(id, undefined, scope);
  } catch (error) {
    if (scope === "guest" || !previous || (error instanceof AccountStorageError && error.status < 500)) {
      writeSessionJournal(id, oldEntry, scope);
      throw error;
    }
  }
  changed();
}

const writes = new Map<string, Promise<void>>();
const closers = new Map<string, () => Promise<void>>();
const plans = new Map<string, Promise<unknown>>();
const archives = new Map<string, Promise<void>>();
const starts = new Map<string, Promise<CoachConversation>>();
const keyFor = (id: string) => `${storageScope()}:${id}`;

function mutateConversation(id: string, mutate: (record: CoachConversation) => CoachConversation): Promise<void> {
  const generation = storageGeneration();
  const scope = storageScope();
  const key = keyFor(id);
  const work = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
    assertScope(scope);
    const record = await getCoachConversation(id);
    if (generation === storageGeneration() && record?.status === "active") await saveCoachConversation(mutate(record));
  });
  writes.set(key, work);
  void work.finally(() => { if (writes.get(key) === work) writes.delete(key); }).catch(() => {});
  return work;
}

export function persistCoachMessages(id: string, messages: ChatMessage[]): Promise<void> {
  return mutateConversation(id, (record) => withConversationMessages(record, messages, new Date().toISOString()));
}

export function registerCoachSession(id: string, close: () => Promise<void>): () => void {
  const key = keyFor(id);
  closers.set(key, close);
  return () => { if (closers.get(key) === close) closers.delete(key); };
}

export function trackCoachPlanTransition<T>(id: string, state: "updating" | "undoing", action: () => Promise<T>): Promise<T> {
  const scope = storageScope();
  const key = keyFor(id);
  const pending = state === "updating" ? "Plan update pending" : "Plan undo pending";
  const work = (async () => {
    await mutateConversation(id, (record) => ({ ...record, resultLabels: [...record.resultLabels.filter((label) => label !== pending), pending] }));
    try {
      assertScope(scope);
      const result = await action();
      assertScope(scope);
      await mutateConversation(id, (record) => ({ ...record, resultLabels: [...record.resultLabels.filter((label) => ![pending, "Plan update failed", "Plan undo failed"].includes(label)), state === "updating" ? "Plan updated" : "Plan update undone"].filter((label, i, all) => all.indexOf(label) === i) }));
      return result;
    } catch (error) {
      assertScope(scope);
      await mutateConversation(id, (record) => ({ ...record, resultLabels: [...record.resultLabels.filter((label) => label !== pending), state === "updating" ? "Plan update failed" : "Plan undo failed"] }));
      throw error;
    }
  })();
  plans.set(key, work);
  void work.finally(() => { if (plans.get(key) === work) plans.delete(key); }).catch(() => {});
  return work;
}

function evidenceFor(record: CoachConversation) {
  return record.messages.filter((m) => m.role === "user" && m.content.trim()).slice(-8).map((m) => m.content.slice(0, 300));
}

export function archiveCoachConversation(id: string): Promise<void> {
  const key = keyFor(id);
  const existing = archives.get(key);
  if (existing) return existing;
  const scope = storageScope();
  const work = (async () => {
    await closers.get(key)?.();
    await writes.get(key);
    await plans.get(key)?.catch(() => {});
    await writes.get(key);
    assertScope(scope);
    let record = await getCoachConversation(id);
    if (!record || record.status === "archived") return;
    if (shouldDiscardConversation(record)) { await deleteCoachConversation(id); return; }
    // A hard close cannot prove that a pending network plan action succeeded.
    record = { ...record, resultLabels: record.resultLabels.map((label) => label === "Plan update pending" ? "Plan update interrupted" : label === "Plan undo pending" ? "Plan undo interrupted" : label) };
    let archive = fallbackConversationArchive(record);
    let processingPending = true;
    let relationship;
    const evidence = evidenceFor(record);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Offline");
      const response = await fetch("/api/coach/archive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversation: record }), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error("Archive processing unavailable");
      const data = await response.json();
      archive = { ...conversationArchiveSchema.parse(data.archive), resultLabels: record.resultLabels };
      assertScope(scope);
      const current = await getCoachRelationship(record.coachId);
      assertScope(scope);
      relationship = applyMemoryDelta(current, data.memoryDelta, new Date().toISOString());
      processingPending = data.processingPending === true;
    } catch { archive = fallbackConversationArchive(record); relationship = undefined; }
    assertScope(scope);
    const archived = archiveConversation(record, archive, new Date().toISOString());
    // Validate and prepare both records before the immutable archive commit.
    if (relationship) {
      try {
        await writeRecords([{ collection: "coachRelationships", key: relationship.coachId, value: relationship }, { collection: "coachConversations", key: id, value: archived }]);
        writeSessionJournal(id, { conversation: archived, syncPending: false, processingPending, evidence }, scope);
        changed();
        return;
      } catch { processingPending = true; }
    }
    writeSessionJournal(id, { conversation: record, syncPending: scope !== "guest", processingPending, evidence }, scope);
    await saveCoachConversation(archived);
  })();
  archives.set(key, work);
  void work.finally(() => { if (archives.get(key) === work) archives.delete(key); }).catch(() => {});
  return work;
}

export async function retryCoachSessionProcessing(): Promise<void> {
  const scope = storageScope();
  for (const [id, entry] of Object.entries(readSessionJournal(scope))) {
    assertScope(scope);
    if (entry.deleted) {
      try { await deleteRecord("coachConversations", id); writeSessionJournal(id, undefined, scope); } catch { /* Retry on reconnect. */ }
      continue;
    }
    if (entry.syncPending) {
      try { await writeRecord("coachConversations", id, entry.conversation); entry.syncPending = false; }
      catch { continue; }
    }
    if (entry.processingPending && entry.conversation.status === "archived" && entry.evidence?.length) {
      try {
        const response = await fetch("/api/coach/archive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ coachId: entry.conversation.coachId, evidence: entry.evidence }), signal: AbortSignal.timeout(10_000) });
        if (!response.ok) continue;
        const data = await response.json();
        if (data.processingPending) continue;
        assertScope(scope);
        const current = await getCoachRelationship(entry.conversation.coachId);
        const delta = data.memoryDelta as CoachMemoryDelta;
        if (delta.learnedPreferences?.some((item) => !entry.evidence!.some((text) => text.includes(item.evidence)))) continue;
        const relationship = applyMemoryDelta(current ?? emptyCoachRelationship(entry.conversation.coachId), delta, new Date().toISOString());
        assertScope(scope);
        await writeRecord("coachRelationships", relationship.coachId, relationship);
        entry.processingPending = false;
      } catch { /* Keep the bounded processing job for the next reconnect. */ }
    }
    assertScope(scope);
    writeSessionJournal(id, entry, scope);
  }
}

export async function reconcileCoachSessions(currentId?: string): Promise<void> {
  for (const record of await listCoachConversations()) {
    if (record.status === "active" && record.id !== currentId) await archiveCoachConversation(record.id);
  }
}

export function startCoachConversation(coachId: CoachId, continuedFromId?: string): Promise<CoachConversation> {
  const key = keyFor(coachId);
  const existing = starts.get(key);
  if (existing) return existing;
  const work = Promise.resolve().then(async () => {
    for (const record of await listCoachConversations(coachId)) if (record.status === "active") await archiveCoachConversation(record.id);
    const record = newCoachConversation(coachId, new Date().toISOString(), continuedFromId);
    await saveCoachConversation(record);
    return record;
  });
  starts.set(key, work);
  void work.finally(() => { if (starts.get(key) === work) starts.delete(key); }).catch(() => {});
  return work;
}
