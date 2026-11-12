import { describe, expect, it } from "vitest";
import { canWriteRecord, parseRecord } from "@/lib/account/records";

describe("account record validation", () => {
  it("accepts an older profile without a coach or intake brief", () => {
    const legacy = {
      goalText: "Build a walking habit",
      tone: "gentle",
      cadence: "brief",
      motivation: "process_focus",
      channels: ["in_app"],
      trackWeight: false,
      createdAt: "2026-11-10T18:00:00.000Z",
    };
    expect(parseRecord({ collection: "meta", key: "profile", value: legacy })?.value).toEqual(legacy);
  });

  it("rejects mismatched keys and records that cannot render", () => {
    const log = { id: "log1", sessionId: "session1", status: "completed", completedAt: "2026-11-10" };
    expect(parseRecord({ collection: "logs", key: "log2", value: log })).toBeNull();
    expect(parseRecord({ collection: "logs", key: "log1", value: { ...log, status: "unknown" } })).toBeNull();
    expect(parseRecord({ collection: "meta", key: "arbitrary", value: {} })).toBeNull();
  });
});

const stamp = "2026-11-11T12:00:00.000Z";
const message = { id: "m1", role: "user", content: "Hello", createdAt: stamp };
const conversation = {
  id: "c1", coachId: "river", status: "archived", messages: [message], title: "Walk",
  summary: "Discussed walking", resultLabels: ["Plan updated"], continuedFromId: "c0",
  createdAt: stamp, updatedAt: stamp, archivedAt: stamp,
};
const relationship = {
  coachId: "river", learnedPreferences: [{ id: "p1", key: "pace", value: "Slow", evidence: "Please go slowly", learnedAt: stamp }],
  rejectedPatterns: ["too many questions"], declinedSwitchSuggestion: false, updatedAt: stamp,
};

describe("coach record validation", () => {
  it("accepts complete conversation and relationship records", () => {
    expect(parseRecord({ collection: "coachConversations", key: "c1", value: conversation })?.value).toEqual(conversation);
    expect(parseRecord({ collection: "coachRelationships", key: "river", value: relationship })?.value).toEqual(relationship);
  });

  it("rejects mismatched conversation IDs and relationship coaches", () => {
    expect(parseRecord({ collection: "coachConversations", key: "c2", value: conversation })).toBeNull();
    expect(parseRecord({ collection: "coachRelationships", key: "jax", value: relationship })).toBeNull();
  });

  it("caps conversation messages and message bodies at their boundaries", () => {
    const record = (value: unknown) => parseRecord({ collection: "coachConversations", key: "c1", value });
    const active = { ...conversation, status: "active", archivedAt: undefined };
    expect(record({ ...conversation, messages: Array.from({ length: 200 }, () => ({ ...message, content: "x".repeat(24_000) })) })).not.toBeNull();
    expect(record({ ...active, messages: Array.from({ length: 201 }, () => message) })).toBeNull();
    expect(record({ ...conversation, messages: Array.from({ length: 3000 }, () => message) })).not.toBeNull();
    expect(record({ ...conversation, messages: Array.from({ length: 3001 }, () => message) })).toBeNull();
    expect(record({ ...conversation, messages: [{ ...message, content: "x".repeat(24_001) }] })).toBeNull();
  });

  it("rejects malformed conversation fields and memory entries", () => {
    for (const patch of [{ coachId: "unknown" }, { status: "open" }, { resultLabels: "bad" }, { updatedAt: "" }, { archivedAt: 1 }, { continuedFromId: "" }, { title: 1 }, { summary: 1 }]) {
      expect(parseRecord({ collection: "coachConversations", key: "c1", value: { ...conversation, ...patch } })).toBeNull();
    }
    expect(parseRecord({ collection: "coachRelationships", key: "river", value: { ...relationship, learnedPreferences: [{ key: "pace", value: "Slow" }] } })).toBeNull();
  });

  it("accepts only the known completed migration marker", () => {
    expect(parseRecord({ collection: "meta", key: "coach-conversation-migration-v2", value: true })?.value).toBe(true);
    expect(parseRecord({ collection: "meta", key: "coach-conversation-migration-v2", value: "yes" })).toBeNull();
  });

  it("preserves typed confirmed shared facts and rejects unconfirmed or unsupported facts", () => {
    const profile = {
      goalText: "Walk", tone: "gentle", cadence: "brief", motivation: "process_focus", channels: [], trackWeight: false, createdAt: stamp,
      sharedFacts: [{ id: "fact-1", category: "schedule", statement: "Free on Tuesdays", confirmedAt: stamp }],
    };
    expect(parseRecord({ collection: "meta", key: "profile", value: profile })?.value).toEqual(profile);
    for (const fact of [
      { id: "fact-1", category: "personality", statement: "Free on Tuesdays", confirmedAt: stamp },
      { id: "fact-1", category: "schedule", statement: "Free on Tuesdays" },
      { id: "fact-1", category: "ability", statement: "x".repeat(221), confirmedAt: stamp },
    ]) expect(parseRecord({ collection: "meta", key: "profile", value: { ...profile, sharedFacts: [fact] } })).toBeNull();
  });
});


describe("conversation replacement policy", () => {
  it("allows new records and same-coach active updates but rejects ownership changes", () => {
    const active = { ...conversation, status: "active" };
    const record = { collection: "coachConversations" as const, key: "c1", value: { ...active, messages: [] } };
    expect(canWriteRecord(undefined, record)).toBe(true);
    expect(canWriteRecord(active, record)).toBe(true);
    expect(canWriteRecord(active, { ...record, value: { ...active, coachId: "jax" } })).toBe(false);
  });

  it("allows identical archive retries and rejects every changed archive", () => {
    const record = { collection: "coachConversations" as const, key: "c1", value: conversation };
    expect(canWriteRecord(conversation, record)).toBe(true);
    for (const patch of [{ messages: [] }, { status: "active" }, { coachId: "jax" }, { summary: "Changed" }]) {
      expect(canWriteRecord(conversation, { ...record, value: { ...conversation, ...patch } })).toBe(false);
    }
  });
});
