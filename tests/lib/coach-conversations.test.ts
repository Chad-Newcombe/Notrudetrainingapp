import { describe, expect, it } from "vitest";
import type { ChatMessage, CoachConversation } from "@/lib/types";
import {
  archiveConversation,
  conversationsForCoach,
  newCoachConversation,
  shouldDiscardConversation,
  withConversationMessages,
} from "@/lib/coach/conversations";

const now = "2026-11-11T12:00:00.000Z";
const later = "2026-11-11T13:00:00.000Z";

const message: ChatMessage = {
  id: "message-1",
  role: "user",
  content: "I want to build consistency.",
  createdAt: now,
};

function conversation(overrides: Partial<CoachConversation> = {}): CoachConversation {
  return {
    id: "conversation-1",
    coachId: "river",
    status: "active",
    messages: [message],
    resultLabels: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("coach conversation transitions", () => {
  it("creates an empty active conversation for the selected coach", () => {
    expect(newCoachConversation("river", now).messages).toEqual([]);
    expect(newCoachConversation("river", now)).toMatchObject({
      coachId: "river",
      status: "active",
      createdAt: now,
      updatedAt: now,
      resultLabels: [],
    });
  });

  it("links a new conversation to the continuation source when provided", () => {
    expect(newCoachConversation("nova", now, "archived-id").continuedFromId).toBe("archived-id");
  });

  it("discards conversations without messages", () => {
    const empty = conversation({ messages: [] });
    expect(shouldDiscardConversation(empty)).toBe(true);
    expect(shouldDiscardConversation(conversation())).toBe(false);
  });

  it("updates messages and timestamp without changing message order", () => {
    const second: ChatMessage = { ...message, id: "message-2", role: "assistant" };
    const original = conversation();
    const updated = withConversationMessages(original, [message, second], later);

    expect(updated.messages.map(({ id }) => id)).toEqual(["message-1", "message-2"]);
    expect(updated.updatedAt).toBe(later);
    expect(original.messages).toEqual([message]);
  });

  it("rejects message changes to archived conversations", () => {
    const archived = conversation({ status: "archived", archivedAt: later, title: "Original title" });
    const snapshot = structuredClone(archived);

    expect(() => withConversationMessages(archived, [], "2026-11-12T12:00:00.000Z"))
      .toThrow("Cannot modify messages on an archived conversation");
    expect(archived).toEqual(snapshot);
  });

  it("archives a conversation with the supplied archive metadata and time", () => {
    const archive = { title: "Building a steady routine", summary: "Agreed on two short sessions each week.", resultLabels: ["plan_updated"] };
    const archived = archiveConversation(conversation(), archive, later);

    expect(archived.status).toBe("archived");
    expect(archived.archivedAt).toBe(later);
    expect(archived.updatedAt).toBe(later);
    expect(archived.title).toBe(archive.title);
    expect(archived.summary).toBe(archive.summary);
    expect(archived.resultLabels).toEqual(archive.resultLabels);
  });

  it("does not invent an archive title or summary", () => {
    const archived = archiveConversation(conversation(), { resultLabels: [] }, later);
    expect(archived.title).toBeUndefined();
    expect(archived.summary).toBeUndefined();
  });

  it("rejects re-archiving and preserves existing transcript and metadata", () => {
    const archived = conversation({
      status: "archived",
      archivedAt: later,
      title: "Original title",
      summary: "Original summary",
      resultLabels: ["plan_updated"],
    });
    const snapshot = structuredClone(archived);

    expect(() => archiveConversation(
      archived,
      { title: "Replacement title", summary: "Replacement summary", resultLabels: ["profile_updated"] },
      "2026-11-12T12:00:00.000Z",
    )).toThrow("Cannot archive an already archived conversation");
    expect(archived).toEqual(snapshot);
  });

  it("filters to the requested coach and sorts newest first", () => {
    const records = [
      conversation({ id: "old", coachId: "nova", updatedAt: "2026-11-10T12:00:00.000Z" }),
      conversation({ id: "other", coachId: "river", updatedAt: later }),
      conversation({ id: "new", coachId: "nova", updatedAt: "2026-11-11T12:30:00.000Z" }),
    ];
    const selected = conversationsForCoach(records, "nova");

    expect(selected.every((c) => c.coachId === "nova")).toBe(true);
    expect(selected.map((c) => c.id)).toEqual(["new", "old"]);
    expect(records[0].id).toBe("old");
  });
});
