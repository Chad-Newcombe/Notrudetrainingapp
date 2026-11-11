import { describe, expect, it } from "vitest";
import { conversationArchiveSchema, fallbackConversationArchive } from "@/lib/coach/archive";
import { newCoachConversation, withConversationMessages } from "@/lib/coach/conversations";
import type { CoachConversation } from "@/lib/types";

const now = "2026-11-11T10:00:00.000Z";
function conversation(first = "Move my long run to Sunday.", last = "Keep Saturday free."): CoachConversation {
  return { ...withConversationMessages(newCoachConversation("sol", now), [
    { id: "u1", role: "user", content: first, createdAt: now },
    { id: "a1", role: "assistant", content: "You've got this. The user prefers flexible weekends.", createdAt: now },
    { id: "u2", role: "user", content: last, createdAt: now },
  ], now), resultLabels: ["Plan updated", "Plan restored"] };
}

describe("deterministic conversation archives", () => {
  it("uses literal first and last user turns without inferring preferences or copying assistant filler", () => {
    const current = conversation();
    const archive = fallbackConversationArchive(current);
    expect(archive.title).toBe("Move my long run to Sunday.");
    expect(archive.summary).toBe('Last request: "Keep Saturday free."');
    expect(archive.resultLabels).toEqual(["Plan updated", "Plan restored"]);
    expect(archive.summary).not.toMatch(/prefers|you've got this|I see|I hear you|No pressure|Just say yes or no/i);
    expect(current.status).toBe("active");
    expect(current.messages).toHaveLength(3);
  });

  it("bounds title and summary deterministically even for long multiline user turns", () => {
    const current = conversation("A ".repeat(500), "B\n".repeat(500));
    const archive = fallbackConversationArchive(current);
    expect(fallbackConversationArchive(current)).toEqual(archive);
    expect(archive.title!.length).toBeLessThanOrEqual(80);
    expect(archive.summary!.length).toBeLessThanOrEqual(220);
    expect(archive.title).not.toContain("\n");
    expect(archive.summary).not.toContain("\n");
    expect(conversationArchiveSchema.safeParse(archive).success).toBe(true);
  });

  it("does not archive empty or assistant-only conversations", () => {
    expect(() => fallbackConversationArchive(newCoachConversation("river", now))).toThrow();
    const current = conversation();
    current.messages = current.messages.filter((message) => message.role === "assistant");
    expect(() => fallbackConversationArchive(current)).toThrow();
    current.messages = [{ id: "empty", role: "user", content: " \n ", createdAt: now }];
    expect(() => fallbackConversationArchive(current)).toThrow();
  });

  it("validates model archives with required factual text and bounded result labels", () => {
    expect(conversationArchiveSchema.safeParse({ title: "Weekend schedule", summary: "Moved the long run to Sunday.", resultLabels: ["Plan updated"] }).success).toBe(true);
    for (const invalid of [
      { title: "", summary: "A request", resultLabels: [] },
      { title: "x".repeat(81), summary: "A request", resultLabels: [] },
      { title: "A request", summary: "x".repeat(221), resultLabels: [] },
      { title: "A request", summary: "A request", resultLabels: ["x".repeat(81)] },
      { title: "A request", summary: "No pressure. You've got this.", resultLabels: [] },
    ]) expect(conversationArchiveSchema.safeParse(invalid).success).toBe(false);
  });
});
