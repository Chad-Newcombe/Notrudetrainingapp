// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatPage from "@/app/(main)/coach/chat/[conversationId]/page";
import { CoachSessionLifecycle } from "@/components/coach/CoachSessionLifecycle";
import { archiveCoachConversation, getActiveCoachConversation, getCoachConversation, listCoachConversations, retryCoachSessionProcessing, saveCoachConversation, startCoachConversation } from "@/lib/store/coach-conversations";
import { clearAll, saveProfile } from "@/lib/store";
import { getDb } from "@/lib/store/db";
import { readSessionJournal } from "@/lib/store/coach-session-journal";
import { setStorageAccount } from "@/lib/store/storage";
import type { CoachConversation, UserProfile } from "@/lib/types";

const nav = vi.hoisted(() => ({ path: "/coach/chat/one", push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useParams: () => ({ conversationId: "one" }), useRouter: () => nav }));
const record: CoachConversation = { id: "one", coachId: "river", status: "active", messages: [
  { id: "u", role: "user", content: "Keep replies short. " + "Long private detail. ".repeat(100), createdAt: "now" },
  { id: "a", role: "assistant", content: "PRIVATE ASSISTANT TRANSCRIPT", createdAt: "now" },
], resultLabels: [], createdAt: "now", updatedAt: "now" };
const profile: UserProfile = { goalText: "Walk", tone: "gentle", cadence: "brief", motivation: "process_focus", channels: ["in_app"], trackWeight: false, coachId: "river", createdAt: "now" };
const output = () => Response.json({ archive: { title: "Brief replies", summary: "Requested brief replies.", resultLabels: [] }, memoryDelta: { coachId: "river", learnedPreferences: [{ key: "reply_length", value: "short", evidence: "Keep replies short." }] }, processingPending: false });
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeEach(async () => { setStorageAccount(null); await clearAll(); localStorage.clear(); nav.path = "/coach/chat/one"; HTMLElement.prototype.scrollTo = () => {}; vi.stubGlobal("fetch", vi.fn(async () => output())); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

for (const result of ["reject", "resolve"] as const) {
  it(`does not continue archive finalization in another account when its batch ${result}s`, async () => {
    setStorageAccount("alice");
    const batch = deferred<Response>();
    const writes: { account: string; body: { records?: unknown[] } }[] = [];
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input).includes("/coach/archive")) return output();
      if (init?.method === "GET") return Response.json({ values: String(input).includes("coachConversations") ? [record] : [] });
      const body = JSON.parse(String(init?.body));
      const account = new Headers(init?.headers).get("x-notrude-account")!;
      writes.push({ account, body });
      if (body.records?.length === 2) return batch.promise;
      return Response.json({ ok: true });
    });
    const closing = archiveCoachConversation("one");
    await waitFor(() => expect(writes).toHaveLength(1));
    setStorageAccount("bob");
    if (result === "reject") batch.reject(new TypeError("connection dropped")); else batch.resolve(Response.json({ ok: true }));
    const failure = await closing.then(() => null, (error: Error) => error);
    expect(failure?.message).toMatch(/Storage account changed/);
    expect(writes.filter((write) => write.account === "bob")).toEqual([]);
    expect(localStorage.getItem("notrude-coach-sessions:account:bob")).toBeNull();
  });
}

for (const read of ["exact", "list"] as const) it(`drops an old active cache when a later ${read} account read confirms archival`, async () => {
  setStorageAccount("alice");
  let remote: CoachConversation = record;
  vi.mocked(fetch).mockImplementation(async (_input, init) => init?.method === "GET" ? Response.json({ values: [remote] }) : Response.json({ ok: true }));
  await getCoachConversation("one");
  expect(readSessionJournal().one.conversation).toEqual(record);
  // Another client, or a batch whose acknowledgement was interrupted, completed it.
  remote = { ...record, status: "archived", archivedAt: "later" };
  if (read === "exact") expect((await getCoachConversation("one"))?.status).toBe("archived");
  else expect((await listCoachConversations())[0].status).toBe("archived");
  expect(readSessionJournal()).toEqual({});
});

it("does not open from a stale active read that resolves after closure finished", async () => {
  setStorageAccount("alice");
  const staleRead = deferred<Response>();
  let reads = 0;
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    if (String(input).includes("/coach/archive")) return output();
    if (init?.method === "GET") {
      if (String(input).includes("coachConversations")) {
        reads += 1;
        return reads === 1 ? staleRead.promise : Response.json({ values: [record] });
      }
      return Response.json({ values: [] });
    }
    return Response.json({ ok: true });
  });
  const opening = getActiveCoachConversation("one");
  await waitFor(() => expect(reads).toBe(1));
  await archiveCoachConversation("one");
  staleRead.resolve(Response.json({ values: [record] }));
  expect(await opening).toBeUndefined();
});

it("rejects new transcript writes after the final archive snapshot is taken", async () => {
  await saveCoachConversation(record);
  const summary = deferred<Response>(); vi.mocked(fetch).mockReturnValue(summary.promise);
  const closing = archiveCoachConversation("one");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  const lateWrite = saveCoachConversation({ ...record, messages: [...record.messages, { id: "late", role: "user", content: "A late turn", createdAt: "later" }] });
  await expect(lateWrite).rejects.toThrow("Conversation is closing");
  summary.resolve(output()); await closing;
  expect((await getCoachConversation("one"))?.messages).toEqual(record.messages);
});

it("does not mount a composer when returning to an ID whose archive is pending", async () => {
  await saveProfile(profile); await saveCoachConversation(record);
  const summary = deferred<Response>(); vi.mocked(fetch).mockReturnValue(summary.promise);
  const closing = archiveCoachConversation("one");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  render(createElement(ChatPage));
  const opened = await screen.findByRole("textbox", {}, { timeout: 150 }).then(() => true, () => false);
  summary.resolve(output()); await act(() => closing);
  expect(opened).toBe(false);
  expect(await screen.findByRole("link", { name: "Back to Coach" })).toBeInTheDocument();
  expect((await getCoachConversation("one"))?.messages).toEqual(record.messages);
});

it("waits for an existing close on A → B → A navigation, including the return path", async () => {
  await saveCoachConversation(record);
  const summary = deferred<Response>(); vi.mocked(fetch).mockReturnValue(summary.promise);
  const child = () => createElement(CoachSessionLifecycle, null, createElement("p", null, "Destination ready"));
  const view = render(child()); await screen.findByText("Destination ready");
  nav.path = "/today"; view.rerender(child());
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  nav.path = "/coach/chat/one"; view.rerender(child());
  const reopened = await screen.findByText("Destination ready", {}, { timeout: 150 }).then(() => true, () => false);
  summary.resolve(output());
  await screen.findByText("Destination ready");
  expect(reopened).toBe(false);
  expect((await getCoachConversation("one"))?.status).toBe("archived");
});

for (const operation of ["archive", "retry"] as const) {
  for (const result of ["resolve", "reject"] as const) {
    it(`clearAll invalidates an in-flight ${operation} after its model request ${result}s`, async () => {
      await saveCoachConversation(record);
      if (operation === "retry") {
        vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
        await archiveCoachConversation("one");
      }
      const summary = deferred<Response>(); vi.mocked(fetch).mockReset().mockReturnValue(summary.promise);
      const work = operation === "archive" ? archiveCoachConversation("one") : retryCoachSessionProcessing();
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
      await clearAll();
      if (result === "resolve") summary.resolve(output()); else summary.reject(new TypeError("offline"));
      await work.catch(() => {});
      const db = await getDb();
      expect(await db.getAll("coachConversations")).toEqual([]);
      expect(await db.getAll("coachRelationships")).toEqual([]);
      expect(localStorage.getItem("notrude-coach-sessions:guest")).toBeNull();
    });
  }
}

it("a new start waits for the old close instead of creating an overlapping session", async () => {
  await saveCoachConversation(record);
  const summary = deferred<Response>(); vi.mocked(fetch).mockReturnValue(summary.promise);
  const closing = archiveCoachConversation("one");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  let started = false;
  const starting = startCoachConversation("river").then((value) => { started = true; return value; });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
  expect(started).toBe(false);
  summary.resolve(output()); await closing;
  expect((await starting).messages).toEqual([]);
});

describe("bounded recovery retention", () => {
  it("removes a completed online archive from the journal", async () => {
    await saveCoachConversation(record); await archiveCoachConversation("one");
    expect(readSessionJournal()).toEqual({});
    expect(localStorage.getItem("notrude-coach-sessions:guest")).toBeNull();
    expect((await getCoachConversation("one"))?.messages).toEqual(record.messages);
  });
  it("keeps only bounded evidence after local archival and removes it after processing", async () => {
    await saveCoachConversation(record); vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    await archiveCoachConversation("one");
    const pending = readSessionJournal()["one"];
    expect(pending).not.toHaveProperty("conversation");
    expect(pending).toMatchObject({ coachId: "river", processingPending: true });
    expect(pending.evidence?.[0]).toHaveLength(300);
    expect(localStorage.getItem("notrude-coach-sessions:guest")).not.toContain("PRIVATE ASSISTANT TRANSCRIPT");
    vi.mocked(fetch).mockImplementation(async () => output()); await retryCoachSessionProcessing();
    expect(readSessionJournal()).toEqual({});
    expect((await getCoachConversation("one"))?.messages).toEqual(record.messages);
  });
  it("retains an unsynced account snapshot only until its exact remote sync succeeds", async () => {
    setStorageAccount("alice");
    let online = true;
    const remote = new Map<string, unknown>();
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (!online) throw new TypeError("offline");
      if (String(input).includes("/coach/archive")) return output();
      if (init?.method === "GET") {
        const query = new URL(String(input), "http://localhost").searchParams;
        return Response.json({ values: [remote.get(`${query.get("collection")}:${query.get("key")}`)].filter(Boolean) });
      }
      const body = JSON.parse(String(init?.body));
      for (const item of body.records ?? (body.record ? [body.record] : [])) remote.set(`${item.collection}:${item.key}`, item.value);
      return Response.json({ ok: true });
    });
    await saveCoachConversation(record);
    online = false; await archiveCoachConversation("one");
    const archived = (await getCoachConversation("one"))!;
    expect(readSessionJournal().one.conversation).toEqual(archived);
    expect(readSessionJournal().one.syncPending).toBe(true);
    online = true; await retryCoachSessionProcessing();
    expect(remote.get("coachConversations:one")).toEqual(archived);
    expect(readSessionJournal()).toEqual({});
    expect(localStorage.getItem("notrude-coach-sessions:account:alice")).toBeNull();
  });
  it("compacts existing completed and processing archive snapshots when read", () => {
    const archived = { ...record, status: "archived", archivedAt: "now" };
    localStorage.setItem("notrude-coach-sessions:guest", JSON.stringify({
      one: { conversation: archived, syncPending: false, processingPending: true, evidence: ["Keep replies short."] },
      done: { conversation: { ...archived, id: "done" }, syncPending: false, processingPending: false },
    }));
    const journal = readSessionJournal();
    expect(journal).not.toHaveProperty("done");
    expect(journal.one).not.toHaveProperty("conversation");
    expect(localStorage.getItem("notrude-coach-sessions:guest")).not.toContain("PRIVATE ASSISTANT TRANSCRIPT");
  });
});
