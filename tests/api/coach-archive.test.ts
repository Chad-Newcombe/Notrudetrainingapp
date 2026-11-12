import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/coach/archive/route";
import type { CoachConversation } from "@/lib/types";
const model = vi.hoisted(() => ({ get: vi.fn(), generate: vi.fn() }));
vi.mock("@/lib/ai/model", () => ({ getModel: model.get, localGenerationOptions: () => ({}) }));
vi.mock("ai", () => ({ generateText: model.generate, Output: { object: (v: unknown) => v } }));
const conversation: CoachConversation = {
  id: "one", coachId: "river", status: "active", messages: [
    { id: "u", role: "user", content: "Keep replies short.", createdAt: "now" },
    { id: "a", role: "assistant", content: "I will keep them brief.", createdAt: "now" },
  ], resultLabels: ["Plan updated"], createdAt: "now", updatedAt: "now",
};
const valid = { archive: { title: "Reply length", summary: "Requested brief replies.", resultLabels: [] }, memoryDelta: { coachId: "river", learnedPreferences: [{ key: "reply_length", value: "short", evidence: "Keep replies short." }] } };
const request = (value = conversation) => new Request("http://localhost/api/coach/archive", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversation: value }) });
beforeEach(() => { model.get.mockReturnValue({}); model.generate.mockReset(); });
describe("coach archive endpoint", () => {
  it("accepts bounded output and preserves actual outcomes rather than model labels", async () => {
    model.generate.mockResolvedValue({ output: { ...valid, archive: { ...valid.archive, resultLabels: ["Invented action"] } } });
    const body = await (await POST(request())).json();
    expect(body.archive).toEqual({ title: "Reply length", summary: "Requested brief replies.", resultLabels: ["Plan updated"] });
    expect(body.memoryDelta).toEqual(valid.memoryDelta);
  });
  for (const memoryDelta of [{ coachId: "sol" }, { coachId: "river", learnedPreferences: [{ key: "identity", value: "new", evidence: "text" }] }]) {
    it(`falls back atomically for unsafe memory ${JSON.stringify(memoryDelta)}`, async () => {
      model.generate.mockResolvedValue({ output: { ...valid, memoryDelta } });
      const body = await (await POST(request())).json();
      expect(body.archive.title).toBe("Keep replies short.");
      expect(body.memoryDelta).toEqual({ coachId: "river" });
      expect(body.processingPending).toBe(true);
    });
  }
  it("uses deterministic metadata without a model", async () => {
    model.get.mockReturnValue(null);
    const body = await (await POST(request())).json();
    expect(body.archive).toEqual({ title: "Keep replies short.", summary: 'Last request: "Keep replies short."', resultLabels: ["Plan updated"] });
    expect(model.generate).not.toHaveBeenCalled();
  });
  it("returns a recoverable fallback on generation failure", async () => {
    model.generate.mockRejectedValue(new Error("offline"));
    const body = await (await POST(request())).json();
    expect(body.archive.title).toBe("Keep replies short.");
    expect(body.processingPending).toBe(true);
    expect(conversation.messages).toHaveLength(2);
  });
  it("rejects archived and empty conversations before model invocation", async () => {
    expect((await POST(request({ ...conversation, status: "archived" }))).status).toBe(400);
    expect((await POST(request({ ...conversation, messages: [] }))).status).toBe(400);
    expect(model.generate).not.toHaveBeenCalled();
  });
});
