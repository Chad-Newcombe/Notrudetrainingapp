// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CoachChat } from "@/components/coach/CoachChat";
import { clearAll, getCoachConversation, getCoachRelationship, getProfile, saveCoachConversation, saveCoachRelationship, saveProfile, getPlan } from "@/lib/store";
import { setStorageAccount } from "@/lib/store/storage";
import type { CoachConversation, UserProfile } from "@/lib/types";
vi.mock("@/components/coach/CoachModelPreview", () => ({ CoachModelPreview: () => null }));
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
const profile: UserProfile = { goalText: "Walk", tone: "gentle", cadence: "brief", motivation: "process_focus", channels: ["in_app"], trackWeight: false, coachId: "river", createdAt: "now" };
const record: CoachConversation = { id: "one", coachId: "river", status: "active", messages: [], resultLabels: [], createdAt: "now", updatedAt: "now" };
const suggestion = { coachId: "jax", reason: "Jax brings more energy and a concrete next move." };
const bodies: { url: string; body: Record<string, unknown> }[] = [];
beforeEach(async () => {
  HTMLElement.prototype.scrollTo = () => {}; setStorageAccount(null); await clearAll(); localStorage.clear(); nav.push.mockClear(); bodies.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url, init) => {
    bodies.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    if (String(url).endsWith("/fit")) return Response.json({ suggestion });
    if (String(url).endsWith("/archive")) throw new Error("offline");
    return Response.json({ text: "Jax may suit this request." }, { headers: { "X-Notrude-Fixture": "1" } });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function mount(value = record, selected = profile) {
  await saveProfile(selected); await saveCoachConversation(value);
  return render(createElement(CoachChat, { conversation: value, profile: selected, plan: null, logs: [] }));
}
async function send(text: string) { const input = await screen.findByRole("textbox"); await waitFor(() => expect(input).toBeEnabled()); fireEvent.change(input, { target: { value: text } }); fireEvent.click(screen.getByRole("button", { name: "Send" })); }
it("requires an explicit action even when the reply names another coach", async () => {
  await mount(); await send("Be more energetic");
  await screen.findByRole("button", { name: "Switch to Jax" });
  expect(screen.getByText(suggestion.reason)).toBeVisible();
  expect((await getProfile())?.coachId).toBe("river");
  expect((await getCoachConversation("one"))?.status).toBe("active");
  expect(nav.push).not.toHaveBeenCalled();
});
it("records staying with River and suppresses future fit requests", async () => {
  await mount(); await send("Be more energetic");
  fireEvent.click(await screen.findByRole("button", { name: "Stay with River" }));
  await waitFor(async () => expect((await getCoachRelationship("river")).declinedSwitchSuggestion).toBe(true));
  expect((await getProfile())?.coachId).toBe("river");
  expect((await getCoachConversation("one"))?.status).toBe("active");
  await send("Be more energetic");
  await waitFor(() => expect(bodies.filter((b) => b.url === "/api/coach")).toHaveLength(2));
  expect(bodies.filter((b) => b.url.endsWith("/fit"))).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Switch to Jax" })).toBeNull();
  expect(bodies.at(-1)?.body.relationship).toMatchObject({ coachId: "river", declinedSwitchSuggestion: true });
});
it("archives before changing profile and opens a fresh target session with only its own memory", async () => {
  await saveCoachRelationship({ coachId: "jax", learnedPreferences: [{ id: "jax-pref", key: "reply_length", value: "short", evidence: "Jax private preference", learnedAt: "now" }], rejectedPatterns: [], declinedSwitchSuggestion: false, updatedAt: "now" });
  await saveCoachRelationship({ coachId: "river", learnedPreferences: [{ id: "river-pref", key: "reassurance", value: "none", evidence: "River private preference", learnedAt: "now" }], rejectedPatterns: [], declinedSwitchSuggestion: false, updatedAt: "now" });
  const sharedProfile = { ...profile, sharedFacts: [{ id: "distance", category: "ability" as const, statement: "Three miles is comfortable", confirmedAt: "now" }] };
  const view = await mount(record, sharedProfile); await send("Be more energetic");
  fireEvent.click(await screen.findByRole("button", { name: "Switch to Jax" }));
  await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/coach"));
  expect((await getCoachConversation("one"))?.status).toBe("archived");
  expect((await getProfile())?.coachId).toBe("jax");
  expect(bodies.find((b) => b.url === "/api/coach")?.body.relationship).toMatchObject({ coachId: "river" });
  view.unmount();
  await mount({ ...record, id: "two", coachId: "jax" }, { ...sharedProfile, coachId: "jax" });
  expect(screen.queryByText("Be more energetic")).toBeNull();
  await send("Next step");
  await waitFor(() => expect(bodies.filter((b) => b.url === "/api/coach")).toHaveLength(2));
  const body = bodies.filter((b) => b.url === "/api/coach").at(-1)!.body;
  expect(JSON.stringify(body)).toContain("Jax private preference");
  expect(JSON.stringify(body)).not.toContain("Be more energetic");
  expect(JSON.stringify(body)).not.toContain("River private preference");
  expect(JSON.stringify(body)).toContain("Three miles is comfortable");
});
it("does not call fit for ordinary training and falls back when fit transport fails", async () => {
  await mount(); await send("I missed my workout");
  await screen.findByText("Jax may suit this request.");
  expect(bodies.some((b) => b.url.endsWith("/fit"))).toBe(false);
  vi.mocked(fetch).mockImplementation(async (url) => {
    if (String(url).endsWith("/fit")) throw new Error("offline");
    return Response.json({ text: "Keep the next move small." }, { headers: { "X-Notrude-Fixture": "1" } });
  });
  await send("Be more energetic");
  await screen.findByRole("button", { name: "Switch to Jax" });
});
it("waits for an in-flight plan revision before completing an accepted switch", async () => {
  let resolvePlan!: (r: Response) => void;
  vi.mocked(fetch).mockImplementation(async (url) => {
    if (String(url).endsWith("/fit")) return Response.json({ suggestion });
    if (String(url) === "/api/plan") return new Promise((resolve) => { resolvePlan = resolve; });
    if (String(url).endsWith("/archive")) throw new Error("offline");
    return Response.json({ text: "Friday fits." }, { headers: { "X-Notrude-Fixture": "1" } });
  });
  await mount(); await send("Be more energetic and move my walk to Friday");
  await waitFor(() => expect(resolvePlan).toBeTypeOf("function"));
  fireEvent.click(await screen.findByRole("button", { name: "Switch to Jax" }));
  expect((await getProfile())?.coachId).toBe("river");
  await saveProfile({ ...profile, constraints: "Confirmed during plan save" });
  resolvePlan(Response.json({ plan: { id: "changed", sessions: [], weekStartIso: "2026-11-09", generatedFromGoal: "Walk" } }));
  await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/coach"));
  expect((await getPlan())?.id).toBe("changed");
  expect((await getProfile())?.constraints).toBe("Confirmed during plan save");
  expect((await getCoachConversation("one"))?.resultLabels).toContain("Plan updated");
});

it("retains a declined suggestion across fresh sessions", async () => {
  await saveCoachRelationship({ coachId: "river", learnedPreferences: [], rejectedPatterns: [], declinedSwitchSuggestion: true, updatedAt: "now" });
  await mount(); await send("Be more energetic");
  await screen.findByText("Jax may suit this request.");
  expect(bodies.some((b) => b.url.endsWith("/fit"))).toBe(false);
  expect(screen.queryByRole("button", { name: "Switch to Jax" })).toBeNull();
  expect(bodies.find((b) => b.url === "/api/coach")?.body.relationship).toMatchObject({ declinedSwitchSuggestion: true });
});
it("treats an explicit written choice to stay as a declined suggestion", async () => {
  await mount(); await send("Be more energetic");
  await screen.findByRole("button", { name: "Stay with River" });
  await send("I want to stay with you");
  await waitFor(async () => expect((await getCoachRelationship("river")).declinedSwitchSuggestion).toBe(true));
  expect(screen.queryByRole("button", { name: "Switch to Jax" })).toBeNull();
});
it("does not record a negated stay request as choosing the current coach", async () => {
  await mount(); await send("Be more energetic");
  await screen.findByRole("button", { name: "Stay with River" });
  await send("I don't want to stay with you");
  await waitFor(() => expect(bodies.filter((b) => b.url === "/api/coach")).toHaveLength(2));
  expect((await getCoachRelationship("river")).declinedSwitchSuggestion).toBe(false);
  expect(screen.getByRole("button", { name: "Switch to Jax" })).toBeVisible();
});
