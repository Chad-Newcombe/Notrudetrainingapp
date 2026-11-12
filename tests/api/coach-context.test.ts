import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/coach/route";
const model = vi.hoisted(() => ({ stream: vi.fn(), convert: vi.fn(async (messages) => messages) }));
vi.mock("@/lib/ai/model", () => ({ getModel: () => ({}), localGenerationOptions: () => ({}) }));
vi.mock("ai", () => ({ convertToModelMessages: model.convert, streamText: model.stream }));
beforeEach(() => { model.stream.mockReset().mockReturnValue({ toUIMessageStreamResponse: () => new Response("ok") }); });
it("uses only a bounded selected summary on the first session turn", async () => {
  await POST(new Request("http://localhost/api/coach", { method: "POST", body: JSON.stringify({ profile: { coachId: "river" }, messages: [{ role: "user", parts: [{ type: "text", text: "Next step?" }] }], continuationSummary: "Bounded prior summary. " + "x".repeat(400) }) }));
  const system = model.stream.mock.calls[0][0].system;
  expect(system).toContain("Bounded prior summary.");
  expect(system).not.toContain("x".repeat(220));
});
it("omits a selected summary after the first user turn", async () => {
  await POST(new Request("http://localhost/api/coach", { method: "POST", body: JSON.stringify({ profile: { coachId: "river" }, messages: [{ role: "user", parts: [] }, { role: "user", parts: [] }], continuationSummary: "Old selected summary" }) }));
  expect(model.stream.mock.calls[0][0].system).not.toContain("Old selected summary");
});
it("supplies only validated selected relationship data without obsolete empathy instructions", async () => {
  const relationship = { coachId: "river", learnedPreferences: [{ id: "hidden", key: "reply_length", value: "short", evidence: "Keep it brief", learnedAt: "now" }], rejectedPatterns: [], declinedSwitchSuggestion: true, updatedAt: "now" };
  for (const coachId of ["river", "sol"]) {
    await POST(new Request("http://localhost/api/coach", { method: "POST", body: JSON.stringify({ profile: { coachId }, relationship, messages: [{ role: "user", parts: [{ type: "text", text: "Help" }] }] }) }));
    const system = model.stream.mock.calls.at(-1)![0].system;
    if (coachId === "river") expect(system).toContain("Keep it brief");
    else expect(system).not.toContain("Keep it brief");
    expect(system).not.toContain("Acknowledge how they feel");
    expect(system).not.toContain("review it before saving");
  }
});
