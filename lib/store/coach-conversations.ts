import { canWriteRecord, coachConversationSchema } from "@/lib/account/records";
import { archiveConversation, conversationsForCoach, newCoachConversation, shouldDiscardConversation, withConversationMessages } from "@/lib/coach/conversations";
import { conversationArchiveSchema, fallbackConversationArchive } from "@/lib/coach/archive";
import { applyMemoryDelta } from "@/lib/coaches/relationship";
import type { ChatMessage, CoachConversation, CoachId, CoachMemoryDelta } from "@/lib/types";
import { storageGeneration } from "./db";
import { getCoachRelationship } from "./coach-relationships";
import { readSessionJournal, writeSessionJournal } from "./coach-session-journal";
import { AccountStorageError, deleteRecord, readRecord, readRecords, storageScope, writeRecord, writeRecords } from "./storage";

function changed() { if (typeof window !== "undefined") window.dispatchEvent(new Event("notrude-coach-conversations")); }
function operationContext() {
  const scope = storageScope();
  const generation = storageGeneration();
  return {
    scope,
    key: (id: string) => `${scope}:${generation}:${id}`,
    assert() {
      if (scope !== storageScope()) throw new Error("Storage account changed.");
      if (generation !== storageGeneration()) throw new Error("Storage was cleared.");
    },
  };
}

export async function listCoachConversations(coachId?: CoachId): Promise<CoachConversation[]> {
  const context = operationContext();
  const local = readSessionJournal(context.scope);
  let records: CoachConversation[];
  let offline = false;
  try { records = await readRecords("coachConversations"); }
  catch (error) { context.assert(); if (!Object.keys(local).length) throw error; records = []; offline = true; }
  context.assert();
  const merged = new Map(records.map((record) => [record.id, record]));
  for (const [id, entry] of Object.entries(local)) {
    const canonical = merged.get(id);
    if (canonical?.status === "archived" && !entry.syncPending) writeSessionJournal(id, { ...entry, conversation: canonical }, context.scope);
    if (entry.deleted) merged.delete(id);
    else if (entry.conversation && (entry.syncPending || offline)) merged.set(id, entry.conversation);
  }
  return coachId === undefined ? [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : conversationsForCoach([...merged.values()], coachId);
}

export async function getCoachConversation(id: string): Promise<CoachConversation | undefined> {
  const context = operationContext();
  const cached = readSessionJournal(context.scope)[id];
  if (cached?.deleted) return undefined;
  if (cached?.syncPending) return cached.conversation;
  try {
    const record = await readRecord("coachConversations", id);
    context.assert();
    if (closed.has(context.key(id)) && record?.status === "active") return undefined;
    if (record && ((record.status === "active" && context.scope !== "guest") || cached)) writeSessionJournal(id, { ...cached, coachId: record.coachId, conversation: record, syncPending: false }, context.scope);
    if (!record && cached) writeSessionJournal(id, undefined, context.scope);
    return record;
  } catch (error) { context.assert(); if (cached?.conversation) return cached.conversation; throw error; }
}

export async function saveCoachConversation(value: CoachConversation): Promise<void> {
  const context = operationContext();
  const parsed = coachConversationSchema.parse(value);
  const previous = await getCoachConversation(parsed.id);
  context.assert();
  if (!canWriteRecord(previous, { collection: "coachConversations", key: parsed.id, value: parsed })) throw new Error("Conversation is immutable or belongs to another coach.");
  if (parsed.status === "active" && finalizing.has(context.key(parsed.id))) throw new Error("Conversation is closing.");
  const oldEntry = readSessionJournal(context.scope)[parsed.id];
  const entry = { ...oldEntry, coachId: parsed.coachId, conversation: parsed, syncPending: context.scope !== "guest" };
  writeSessionJournal(parsed.id, entry, context.scope);
  try {
    await writeRecord("coachConversations", parsed.id, parsed);
    context.assert();
    writeSessionJournal(parsed.id, { ...entry, syncPending: false }, context.scope);
  } catch (error) {
    context.assert();
    if (context.scope === "guest" || typeof localStorage === "undefined" || (error instanceof AccountStorageError && error.status < 500)) {
      writeSessionJournal(parsed.id, oldEntry, context.scope);
      throw error;
    }
    // Retry network/server failures from the original account's exact snapshot.
  }
  changed();
}

export async function deleteCoachConversation(id: string): Promise<void> {
  const context = operationContext();
  const previous = await getCoachConversation(id);
  context.assert();
  const oldEntry = readSessionJournal(context.scope)[id];
  if (context.scope !== "guest" && previous) writeSessionJournal(id, { coachId: previous.coachId, syncPending: true, deleted: true }, context.scope);
  try {
    await deleteRecord("coachConversations", id);
    context.assert();
    writeSessionJournal(id, undefined, context.scope);
  } catch (error) {
    context.assert();
    if (context.scope === "guest" || !previous || (error instanceof AccountStorageError && error.status < 500)) {
      writeSessionJournal(id, oldEntry, context.scope);
      throw error;
    }
  }
  changed();
}

const writes = new Map<string, Promise<void>>();
const closers = new Map<string, () => Promise<void>>();
const plans = new Map<string, Promise<unknown>>();
const archives = new Map<string, Promise<void>>();
const finalizing = new Set<string>();
const closed = new Set<string>();
const starts = new Map<string, Promise<CoachConversation>>();

function serializeWrite(id: string, action: () => Promise<void>, context = operationContext()): Promise<void> {
  const key = context.key(id);
  const work = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
    context.assert();
    await action();
    context.assert();
  });
  writes.set(key, work);
  void work.finally(() => { if (writes.get(key) === work) writes.delete(key); }).catch(() => {});
  return work;
}

function mutateConversation(id: string, mutate: (record: CoachConversation) => CoachConversation): Promise<void> {
  const context = operationContext();
  return serializeWrite(id, async () => {
    const record = await getCoachConversation(id);
    context.assert();
    if (record?.status === "active") await saveCoachConversation(mutate(record));
  }, context);
}

export function persistCoachMessages(id: string, messages: ChatMessage[]): Promise<void> {
  return mutateConversation(id, (record) => withConversationMessages(record, messages, new Date().toISOString()));
}

export function registerCoachSession(id: string, close: () => Promise<void>): () => void {
  const key = operationContext().key(id);
  closers.set(key, close);
  // Covers a close beginning between the route's read and the component effect.
  if (archives.has(key) || closed.has(key)) void close().catch(() => {});
  return () => { if (closers.get(key) === close) closers.delete(key); };
}

export async function getActiveCoachConversation(id: string): Promise<CoachConversation | undefined> {
  const context = operationContext();
  const key = context.key(id);
  if (closed.has(key)) return undefined;
  await archives.get(key);
  context.assert();
  let record = await getCoachConversation(id);
  context.assert();
  // A closure may have started while the record was being read.
  if (archives.has(key)) {
    await archives.get(key);
    context.assert();
    record = await getCoachConversation(id);
    context.assert();
  }
  return !closed.has(key) && record?.status === "active" ? record : undefined;
}

export function trackCoachPlanTransition<T>(id: string, state: "updating" | "undoing", action: () => Promise<T>): Promise<T> {
  const context = operationContext();
  const key = context.key(id);
  const pending = state === "updating" ? "Plan update pending" : "Plan undo pending";
  const work = (async () => {
    await mutateConversation(id, (record) => ({ ...record, resultLabels: [...record.resultLabels.filter((label) => label !== pending), pending] }));
    try {
      context.assert();
      const result = await action();
      context.assert();
      await mutateConversation(id, (record) => ({ ...record, resultLabels: [...record.resultLabels.filter((label) => ![pending, "Plan update failed", "Plan undo failed"].includes(label)), state === "updating" ? "Plan updated" : "Plan update undone"].filter((label, i, all) => all.indexOf(label) === i) }));
      return result;
    } catch (error) {
      context.assert();
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
  const context = operationContext();
  const key = context.key(id);
  const existing = archives.get(key);
  if (existing) return existing;
  const work = (async () => {
    await closers.get(key)?.();
    await writes.get(key);
    await plans.get(key)?.catch(() => {});
    await writes.get(key);
    context.assert();
    finalizing.add(key);
    let record = await getCoachConversation(id);
    context.assert();
    if (!record || record.status === "archived") return;
    if (shouldDiscardConversation(record)) { await deleteCoachConversation(id); return; }
    record = { ...record, resultLabels: record.resultLabels.map((label) => label === "Plan update pending" ? "Plan update interrupted" : label === "Plan undo pending" ? "Plan undo interrupted" : label) };
    let archive = fallbackConversationArchive(record);
    let processingPending = true;
    let relationship;
    const evidence = evidenceFor(record);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("Offline");
      const response = await fetch("/api/coach/archive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversation: record }), signal: AbortSignal.timeout(10_000) });
      context.assert();
      if (!response.ok) throw new Error("Archive processing unavailable");
      const data = await response.json();
      context.assert();
      archive = { ...conversationArchiveSchema.parse(data.archive), resultLabels: record.resultLabels };
      const current = await getCoachRelationship(record.coachId);
      context.assert();
      relationship = applyMemoryDelta(current, data.memoryDelta, new Date().toISOString());
      processingPending = data.processingPending === true;
    } catch { context.assert(); archive = fallbackConversationArchive(record); relationship = undefined; }
    context.assert();
    const archived = archiveConversation(record, archive, new Date().toISOString());
    if (relationship) {
      try {
        await writeRecords([{ collection: "coachRelationships", key: relationship.coachId, value: relationship }, { collection: "coachConversations", key: id, value: archived }]);
        context.assert();
        writeSessionJournal(id, { coachId: record.coachId, syncPending: false, processingPending, evidence }, context.scope);
        changed();
        return;
      } catch { context.assert(); processingPending = true; }
    }
    context.assert();
    writeSessionJournal(id, { coachId: record.coachId, conversation: record, syncPending: context.scope !== "guest", processingPending, evidence }, context.scope);
    await saveCoachConversation(archived);
    context.assert();
  })().then(() => { context.assert(); closed.add(key); });
  archives.set(key, work);
  void work.finally(() => {
    if (archives.get(key) === work) archives.delete(key);
    finalizing.delete(key);
  }).catch(() => {});
  return work;
}

export async function retryCoachSessionProcessing(): Promise<void> {
  const context = operationContext();
  for (const id of Object.keys(readSessionJournal(context.scope))) {
    context.assert();
    await archives.get(context.key(id));
    context.assert();
    await serializeWrite(id, async () => {
      const entry = readSessionJournal(context.scope)[id];
      if (!entry) return;
      if (entry.deleted) {
        try {
          await deleteRecord("coachConversations", id);
          context.assert();
          writeSessionJournal(id, undefined, context.scope);
        } catch { context.assert(); }
        return;
      }
      if (entry.syncPending && entry.conversation) {
        try {
          await writeRecord("coachConversations", id, entry.conversation);
          context.assert();
          entry.syncPending = false;
          writeSessionJournal(id, entry, context.scope);
        } catch { context.assert(); return; }
      }
      if (entry.processingPending && entry.conversation?.status !== "active") {
        try {
          if (entry.evidence?.length) {
            const response = await fetch("/api/coach/archive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ coachId: entry.coachId, evidence: entry.evidence }), signal: AbortSignal.timeout(10_000) });
            context.assert();
            if (!response.ok) return;
            const data = await response.json();
            context.assert();
            if (data.processingPending) return;
            const current = await getCoachRelationship(entry.coachId);
            context.assert();
            const delta = data.memoryDelta as CoachMemoryDelta;
            if (delta.learnedPreferences?.some((item) => !entry.evidence!.some((text) => text.includes(item.evidence)))) return;
            const relationship = applyMemoryDelta(current, delta, new Date().toISOString());
            await writeRecord("coachRelationships", relationship.coachId, relationship);
            context.assert();
          }
          entry.processingPending = false;
        } catch { context.assert(); }
      }
      context.assert();
      writeSessionJournal(id, entry, context.scope);
    }, context);
  }
}

export async function reconcileCoachSessions(currentId?: string): Promise<void> {
  const context = operationContext();
  if (currentId) await archives.get(context.key(currentId));
  context.assert();
  const records = await listCoachConversations();
  context.assert();
  for (const record of records) {
    if (record.status === "active" && record.id !== currentId) await archiveCoachConversation(record.id);
    context.assert();
  }
}

export function startCoachConversation(coachId: CoachId, continuedFromId?: string): Promise<CoachConversation> {
  const context = operationContext();
  const key = context.key(coachId);
  const existing = starts.get(key);
  if (existing) return existing;
  const work = Promise.resolve().then(async () => {
    context.assert();
    const records = await listCoachConversations(coachId);
    context.assert();
    for (const record of records) {
      if (record.status === "active") await archiveCoachConversation(record.id);
      context.assert();
    }
    const record = newCoachConversation(coachId, new Date().toISOString(), continuedFromId);
    await saveCoachConversation(record);
    context.assert();
    return record;
  });
  starts.set(key, work);
  void work.finally(() => { if (starts.get(key) === work) starts.delete(key); }).catch(() => {});
  return work;
}
