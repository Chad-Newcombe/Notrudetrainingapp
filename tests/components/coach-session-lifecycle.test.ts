// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoachSessionLifecycle } from "@/components/coach/CoachSessionLifecycle";
import { StartCoachChat } from "@/components/coach/StartCoachChat";
import { archiveCoachConversation, getCoachConversation, listCoachConversations, saveCoachConversation, trackCoachPlanTransition, retryCoachSessionProcessing, startCoachConversation } from "@/lib/store/coach-conversations";
import { clearAll, getCoachRelationship } from "@/lib/store";
import { setStorageAccount } from "@/lib/store/storage";
import type { CoachConversation } from "@/lib/types";
const nav = vi.hoisted(() => ({ path: "/coach/chat/one", push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useRouter: () => nav }));
const record: CoachConversation = { id: "one", coachId: "river", status: "active", messages: [{ id: "u", role: "user", content: "Keep replies short.", createdAt: "now" }], resultLabels: [], createdAt: "now", updatedAt: "now" };
beforeEach(async () => { setStorageAccount(null); await clearAll(); localStorage.clear(); nav.path = "/coach/chat/one"; nav.push.mockReset(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ archive: { title: "Brief replies", summary: "Requested brief replies.", resultLabels: [] }, memoryDelta: { coachId: "river" } }))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const lifecycle = () => createElement(CoachSessionLifecycle, null, createElement("p", null, "Ready page"));
describe("persistent coach lifecycle", () => {
  for (const target of ["/today", "/coach", "/coach/chat/two"]) {
    it(`archives once when leaving for ${target}`, async () => {
      await saveCoachConversation(record);
      const view = render(lifecycle());
      await screen.findByText("Ready page");
      nav.path = target; view.rerender(lifecycle());
      await waitFor(async () => expect((await getCoachConversation("one"))?.status).toBe("archived"));
      view.rerender(lifecycle());
      expect((await getCoachConversation("one"))?.messages).toEqual(record.messages);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  }
  it("discards an empty session and reconciles hard-close sessions before rendering the landing", async () => {
    await saveCoachConversation({ ...record, messages: [] });
    await saveCoachConversation({ ...record, id: "abandoned" });
    nav.path = "/coach";
    render(lifecycle());
    await screen.findByText("Ready page");
    expect(await getCoachConversation("one")).toBeUndefined();
    expect((await getCoachConversation("abandoned"))?.status).toBe("archived");
  });
  it("does not wait for a network request when the browser is offline", async () => {
    await saveCoachConversation(record);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await archiveCoachConversation("one");
    expect((await getCoachConversation("one"))?.status).toBe("archived");
    expect(fetch).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
  it("archives offline locally with a separate processing retry marker", async () => {
    await saveCoachConversation(record);
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await archiveCoachConversation("one");
    expect((await getCoachConversation("one"))?.status).toBe("archived");
    expect((await getCoachConversation("one"))?.messages).toEqual(record.messages);
    expect(localStorage.getItem("notrude-coach-sessions:guest")).toContain('"processingPending":true');
  });
  it("defers final archive labels until in-flight plan work settles", async () => {
    await saveCoachConversation(record);
    let finish!: () => void;
    const work = trackCoachPlanTransition("one", "updating", () => new Promise<void>((resolve) => { finish = resolve; }));
    const closing = archiveCoachConversation("one");
    await waitFor(() => expect(finish).toBeTypeOf("function"));
    expect((await getCoachConversation("one"))?.status).toBe("active");
    finish(); await work; await closing;
    expect((await getCoachConversation("one"))?.resultLabels).toContain("Plan updated");
    expect((await getCoachConversation("one"))?.status).toBe("archived");
  });
  it("records actual undo failure before archival", async () => {
    await saveCoachConversation({ ...record, resultLabels: ["Plan updated"] });
    const work = trackCoachPlanTransition("one", "undoing", async () => { throw new Error("save failed"); });
    await expect(work).rejects.toThrow("save failed");
    await archiveCoachConversation("one");
    expect((await getCoachConversation("one"))?.resultLabels).toEqual(["Plan updated", "Plan undo failed"]);
  });
  it("retry processes only captured bounded evidence and never mutates archived metadata", async () => {
    await saveCoachConversation({ ...record, messages: [{ ...record.messages[0], content: "Keep replies short. " + "private ".repeat(100) }] });
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    await archiveCoachConversation("one");
    const archived = await getCoachConversation("one");
    vi.mocked(fetch).mockReset().mockResolvedValue(Response.json({ archive: { title: "Changed title", summary: "Changed summary", resultLabels: [] }, memoryDelta: { coachId: "river", learnedPreferences: [{ key: "reply_length", value: "short", evidence: "Keep replies short." }] }, processingPending: false }));
    await retryCoachSessionProcessing();
    expect(await getCoachConversation("one")).toEqual(archived);
    expect((await getCoachRelationship("river")).learnedPreferences[0].value).toBe("short");
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body).not.toHaveProperty("conversation");
    expect(body).not.toHaveProperty("messages");
    expect(body.evidence[0]).toHaveLength(300);
    expect(localStorage.getItem("notrude-coach-sessions:guest")).toContain('"processingPending":false');
  });
  it("clearAll removes pending session recovery data too", async () => {
    await saveCoachConversation(record);
    await clearAll();
    expect(await getCoachConversation("one")).toBeUndefined();
    expect(await listCoachConversations()).toEqual([]);
  });
  it("concurrent starts return one usable active session", async () => {
    const [first, second] = await Promise.all([startCoachConversation("river"), startCoachConversation("river")]);
    expect(first.id).toBe(second.id);
    expect((await listCoachConversations("river")).filter((item) => item.status === "active")).toHaveLength(1);
  });
  it("starting again closes the prior active session for that coach", async () => {
    await saveCoachConversation(record);
    render(createElement(StartCoachChat, { coachId: "river" }));
    screen.getByRole("button", { name: "Start a new chat" }).click();
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(1));
    expect((await listCoachConversations("river")).filter((c) => c.status === "active")).toHaveLength(1);
    expect((await getCoachConversation("one"))?.status).toBe("archived");
  });
});


describe("account session recovery", () => {
  function accountTransport() {
    const remote = new Map<string, unknown>();
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const url = String(input);
      if (!url.startsWith("/api/account/data")) throw new Error("No model");
      if (init?.method === "GET") {
        const query = new URL(url, "http://localhost").searchParams;
        const collection = query.get("collection"); const key = query.get("key");
        const values = key ? [remote.get(`${collection}:${key}`)].filter(Boolean) : [...remote.entries()].filter(([id]) => id.startsWith(`${collection}:`)).map(([, value]) => value);
        return Response.json({ values });
      }
      const body = JSON.parse(String(init?.body));
      if (body.action === "delete") remote.delete(`${body.collection}:${body.key}`);
      for (const item of body.records ?? (body.record ? [body.record] : [])) remote.set(`${item.collection}:${item.key}`, item.value);
      return Response.json({ ok: true });
    });
    return remote;
  }
  it("keeps an offline account archive local, isolated, and syncs the exact immutable record", async () => {
    setStorageAccount("alice");
    const remote = accountTransport();
    await saveCoachConversation(record);
    vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    await archiveCoachConversation("one");
    const archived = await getCoachConversation("one");
    expect(archived?.status).toBe("archived");
    setStorageAccount("bob");
    vi.mocked(fetch).mockResolvedValue(Response.json({ values: [] }));
    expect(await getCoachConversation("one")).toBeUndefined();
    setStorageAccount("alice");
    const restored = accountTransport();
    await retryCoachSessionProcessing();
    expect(restored.get("coachConversations:one")).toEqual(archived);
    expect(remote.get("coachConversations:one")).toEqual(record);
  });
  it("does not resurrect a remotely deleted synced archive from its processing journal", async () => {
    setStorageAccount("alice");
    const remote = accountTransport();
    await saveCoachConversation(record);
    await archiveCoachConversation("one");
    remote.delete("coachConversations:one");
    expect(await getCoachConversation("one")).toBeUndefined();
    expect(await listCoachConversations()).toEqual([]);
  });
  it("discards empty account sessions offline and retries the exact deletion", async () => {
    setStorageAccount("alice");
    accountTransport();
    await saveCoachConversation({ ...record, messages: [] });
    vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    await archiveCoachConversation("one");
    expect(await getCoachConversation("one")).toBeUndefined();
    const remote = accountTransport();
    remote.set("coachConversations:one", { ...record, messages: [] });
    await retryCoachSessionProcessing();
    expect(remote.has("coachConversations:one")).toBe(false);
  });
  it("never applies retry memory into an account selected during processing", async () => {
    setStorageAccount("alice"); accountTransport(); await saveCoachConversation(record); await archiveCoachConversation("one");
    let relationshipRead!: (response: Response) => void;
    const writes: unknown[] = [];
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input).includes("/coach/archive")) return Response.json({ memoryDelta: { coachId: "river" }, processingPending: false });
      if (init?.method === "GET") return new Promise((resolve) => { relationshipRead = resolve; });
      writes.push(init?.body); return Response.json({ ok: true });
    });
    const retrying = retryCoachSessionProcessing();
    await waitFor(() => expect(relationshipRead).toBeTypeOf("function"));
    setStorageAccount("bob"); relationshipRead(Response.json({ values: [] }));
    await expect(retrying).rejects.toThrow("Storage account changed");
    expect(writes).toEqual([]);
  });
  it("does not return an old account snapshot after the account changes during a read", async () => {
    setStorageAccount("alice"); accountTransport(); await saveCoachConversation(record);
    let respond!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise((resolve) => { respond = resolve; }));
    const reading = getCoachConversation("one");
    setStorageAccount("bob"); respond(Response.json({ values: [record] }));
    await expect(reading).rejects.toThrow("Storage account changed");
  });
  it("rejects a server conflict instead of disguising it as offline success", async () => {
    setStorageAccount("alice");
    accountTransport();
    await saveCoachConversation(record);
    vi.mocked(fetch).mockImplementation(async (_input, init) => init?.method === "GET" ? Response.json({ values: [record] }) : Response.json({ error: "Conflict" }, { status: 409 }));
    await expect(saveCoachConversation({ ...record, summary: "Wrong replacement" })).rejects.toThrow("Conflict");
    expect((await getCoachConversation("one"))?.summary).toBeUndefined();
  });
});
