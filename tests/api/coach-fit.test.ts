import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/coach/fit/route";
const model = vi.hoisted(() => ({ get: vi.fn(), generate: vi.fn() }));
vi.mock("@/lib/ai/model", () => ({ getModel: model.get, localGenerationOptions: () => ({}) }));
vi.mock("ai", () => ({ generateText: model.generate, Output: { object: (v: unknown) => v } }));
const request = (extra = {}) => new Request("http://localhost/api/coach/fit", { method: "POST", body: JSON.stringify({ coachId: "river", text: "Be more energetic", ...extra }) });
beforeEach(() => { model.get.mockReturnValue(null); model.generate.mockReset(); });
it("returns a deterministic suggestion without a model", async () => {
  expect((await (await POST(request())).json()).suggestion).toEqual({ coachId: "jax", reason: "Jax brings more energy and a concrete next move." });
});
it("never classifies ordinary training, same-coach fit, or a declined switch", async () => {
  for (const extra of [{ text: "Make my workouts harder" }, { coachId: "jax" }, { declinedSwitchSuggestion: true }]) {
    expect(await (await POST(request(extra))).json()).toEqual({ suggestion: null });
  }
  expect(model.generate).not.toHaveBeenCalled();
});
it("accepts structured fit and falls back on unavailable or invalid model output", async () => {
  model.get.mockReturnValue({});
  for (const output of [{ suggestion: { coachId: "jax", reason: "More active delivery." } }, { suggestion: { coachId: "evil", reason: "Switch now" } }, { suggestion: { coachId: "river", reason: "Same coach" } }]) {
    model.generate.mockResolvedValue({ output });
    expect((await (await POST(request())).json()).suggestion?.coachId).toBe("jax");
  }
  model.generate.mockRejectedValue(new Error("offline"));
  expect((await (await POST(request())).json()).suggestion?.coachId).toBe("jax");
});
it("rejects unbounded or malformed input", async () => {
  for (const extra of [{ text: "x".repeat(24001) }, { coachId: "unknown" }, { text: 5 }]) expect((await POST(request(extra))).status).toBe(400);
});
