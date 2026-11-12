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
