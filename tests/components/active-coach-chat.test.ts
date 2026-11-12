// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoachChat } from "@/components/coach/CoachChat";
import { archiveCoachConversation, clearAll, getCoachConversation, saveCoachConversation, getProfile, savePlan, getPlan } from "@/lib/store";
import { setStorageAccount } from "@/lib/store/storage";
import type { CoachConversation, UserProfile, TrainingPlan } from "@/lib/types";
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
const now = "2026-11-12T12:00:00.000Z";
const profile: UserProfile = { goalText: "Walk", tone: "gentle", cadence: "brief", motivation: "process_focus", channels: ["in_app"], trackWeight: false, coachId: "river", createdAt: now };
const record: CoachConversation = { id: "one", coachId: "river", status: "active", messages: [], resultLabels: [], createdAt: now, updatedAt: now };
beforeEach(async () => { HTMLElement.prototype.scrollTo = () => {}; setStorageAccount(null); await clearAll(); localStorage.clear(); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function mount(value = record) { await saveCoachConversation(value); render(createElement(CoachChat, { conversation: value, profile, plan: null, logs: [] })); await screen.findByRole("textbox"); }
function send(text: string) { fireEvent.change(screen.getByRole("textbox"), { target: { value: text } }); fireEvent.click(screen.getByRole("button", { name: "Send" })); }
const reply = () => Response.json({ text: "Take a short walk." }, { headers: { "X-Notrude-Fixture": "1" } });
describe("exact active coach persistence", () => {
  it("durably saves a submitted turn before issuing the model request", async () => {
    let persistedAtRequest: string[] | undefined;
    vi.mocked(fetch).mockImplementation(async () => {
      persistedAtRequest = (await getCoachConversation("one"))?.messages.map((m) => m.content);
      return reply();
    });
    await mount(); send("What fits today?");
    await screen.findByText("Take a short walk.");
    expect(persistedAtRequest).toEqual(["What fits today?"]);
  });
  it("stops accepting messages once the session begins closing", async () => {
    await mount({ ...record, messages: [{ id: "u", role: "user", content: "Help with walks", createdAt: now }] });
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    await act(() => archiveCoachConversation("one"));
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
  it("saves the pending user turn before the response and preserves it on failure", async () => {
    let fail!: (error: Error) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    await mount(); send("What fits today?");
    await waitFor(async () => expect((await getCoachConversation("one"))?.messages.map((m) => m.content)).toEqual(["What fits today?"]));
    fail(new Error("offline"));
    await screen.findByRole("button", { name: "Try again" });
    expect((await getCoachConversation("one"))?.messages).toHaveLength(1);
  });
  it("persists each completed reply and retries the same user turn without duplication", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline")).mockImplementation(async () => reply());
    await mount(); send("What fits today?");
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await screen.findByText("Take a short walk.");
    await waitFor(async () => expect((await getCoachConversation("one"))?.messages).toHaveLength(2));
    const stored = (await getCoachConversation("one"))!;
    expect(stored.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(new Set(stored.messages.map((m) => m.id)).size).toBe(2);
    const bodies = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    expect(bodies[1].messages.filter((m: { role: string }) => m.role === "user")).toHaveLength(1);
    expect(bodies[1].messages[0].id).toBe(bodies[0].messages[0].id);
  });
  it("sends only the current session and a same-coach selected bounded summary", async () => {
    await saveCoachConversation({ ...record, id: "prior", status: "archived", summary: "Brief walks requested.", messages: [{ id: "secret", role: "user", content: "Private full old transcript", createdAt: now }] });
    vi.mocked(fetch).mockImplementation(async () => reply());
    await mount({ ...record, continuedFromId: "prior" });
    expect(fetch).not.toHaveBeenCalled(); send("Next step?");
    await screen.findByText("Take a short walk.");
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.continuationSummary).toBe("Brief walks requested.");
    expect(body.messages).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain("Private full old transcript");
  });
  it("finishes an actual plan update after unmount before committing archive outcomes", async () => {
    const previous: TrainingPlan = { id: "old", weekStartIso: "2026-11-09", sessions: [], generatedFromGoal: "Walk" };
    const next = { ...previous, id: "new" };
    await savePlan(previous); await saveCoachConversation(record);
    let resolvePlan!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input) === "/api/plan") return new Promise((resolve) => { resolvePlan = resolve; });
      if (String(input).includes("archive")) throw new Error("offline");
      return reply();
    });
    const view = render(createElement(CoachChat, { conversation: record, profile, plan: previous, logs: [] }));
    await screen.findByRole("textbox"); send("Make my walks shorter.");
    await waitFor(() => expect(resolvePlan).toBeTypeOf("function"));
    view.unmount();
    const closing = archiveCoachConversation("one");
    expect((await getCoachConversation("one"))?.status).toBe("active");
    resolvePlan(Response.json({ plan: next })); await closing;
    expect(await getPlan()).toEqual(next);
    expect((await getCoachConversation("one"))?.resultLabels).toEqual(["Plan updated"]);
    expect((await getCoachConversation("one"))?.status).toBe("archived");
  });
  it("does not recreate a plan when clearAll interrupts archive waiting for that plan", async () => {
    const previous: TrainingPlan = { id: "old", weekStartIso: "2026-11-09", sessions: [], generatedFromGoal: "Walk" };
    await savePlan(previous); await saveCoachConversation(record);
    let resolvePlan!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(async (input) => String(input) === "/api/plan" ? new Promise((resolve) => { resolvePlan = resolve; }) : reply());
    render(createElement(CoachChat, { conversation: record, profile, plan: previous, logs: [] }));
    await screen.findByRole("textbox"); send("Make my walks shorter.");
    await waitFor(() => expect(resolvePlan).toBeTypeOf("function"));
    const closing = archiveCoachConversation("one");
    await clearAll();
    resolvePlan(Response.json({ plan: { ...previous, id: "late-plan" } }));
    await closing.catch(() => {});
    await screen.findByText("Your plan wasn't changed.");
    expect(await getPlan()).toBeNull();
    expect(await getCoachConversation("one")).toBeUndefined();
    expect(localStorage.getItem("notrude-coach-sessions:guest")).toBeNull();
  });
  it("does not save an in-flight plan into a newly selected account", async () => {
    const previous: TrainingPlan = { id: "old", weekStartIso: "2026-11-09", sessions: [], generatedFromGoal: "Walk" };
    await savePlan(previous); await saveCoachConversation(record);
    let resolvePlan!: (response: Response) => void;
    const accountWrites: unknown[] = [];
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input) === "/api/plan") return new Promise((resolve) => { resolvePlan = resolve; });
      if (String(input).startsWith("/api/account")) {
        if (init?.method === "POST") accountWrites.push(JSON.parse(String(init.body)));
        return Response.json({ values: [] });
      }
      return reply();
    });
    render(createElement(CoachChat, { conversation: record, profile, plan: previous, logs: [] }));
    await screen.findByRole("textbox"); send("Make my walks shorter.");
    await waitFor(() => expect(resolvePlan).toBeTypeOf("function"));
    setStorageAccount("another-account");
    resolvePlan(Response.json({ plan: { ...previous, id: "wrong-account-plan" } }));
    await screen.findByText("Your plan wasn't changed.");
    expect(accountWrites).toEqual([]);
  });
  it("archives before changing coaches and returns to Fresh First", async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json({ archive: { title: "Walks", summary: "Walks discussed.", resultLabels: [] }, memoryDelta: { coachId: "river" } }));
    await mount({ ...record, messages: [{ id: "u", role: "user", content: "Help with walks", createdAt: now }] });
    fireEvent.click(screen.getByRole("button", { name: /^Sol/ }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/coach"));
    expect((await getCoachConversation("one"))?.status).toBe("archived");
    expect((await getProfile())?.coachId).toBe("sol");
  });
  it("saves the current snapshot when leaving during an unfinished reply", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).includes("archive")) throw new Error("offline");
      return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('data: {"type":"start","messageId":"reply"}\n\ndata: {"type":"text-start","id":"t"}\n\ndata: {"type":"text-delta","id":"t","delta":"Partial reply"}\n\n')); } }), { headers: { "content-type": "text/event-stream" } });
    });
    await mount(); send("What fits today?");
    await screen.findByText("Partial reply");
    await archiveCoachConversation("one");
    expect((await getCoachConversation("one"))?.status).toBe("archived");
    expect((await getCoachConversation("one"))?.messages.map((m) => m.content)).toEqual(["What fits today?", "Partial reply"]);
  });
});
