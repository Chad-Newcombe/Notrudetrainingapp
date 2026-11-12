// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CoachPage from "@/app/(main)/coach/page";
import ChatPage from "@/app/(main)/coach/chat/[conversationId]/page";
import { archiveCoachConversation, clearAll, getCoachConversation, getCoachRelationship, getPlan, listCoachConversations, saveCoachRelationship, saveProfile } from "@/lib/store";
import { setStorageAccount } from "@/lib/store/storage";
import type { UserProfile } from "@/lib/types";

const nav = vi.hoisted(() => ({ push: vi.fn(), id: "" }));
vi.mock("next/navigation", () => ({ useRouter: () => nav, useParams: () => ({ conversationId: nav.id }) }));
const now = "2026-11-11T12:00:00.000Z";
const profile: UserProfile = { goalText: "Walk regularly", tone: "gentle", cadence: "brief", motivation: "process_focus", channels: ["in_app"], trackWeight: false, coachId: "river", createdAt: now };
const calls: string[] = [];
beforeEach(async () => {
  HTMLElement.prototype.scrollTo = () => {};
  setStorageAccount(null); await clearAll(); localStorage.clear(); await saveProfile(profile); nav.push.mockReset(); calls.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url) => {
    calls.push(String(url));
    if (String(url) === "/api/plan") return Response.json({ plan: { id: "changed", sessions: [], weekStartIso: "2026-11-09", generatedFromGoal: "Walk" } });
    if (String(url).endsWith("/archive")) return Response.json({ archive: { title: "Friday walk", summary: "Moved the walk to Friday.", resultLabels: [] }, memoryDelta: { coachId: "river" } });
    return Response.json({ text: "Friday fits." }, { headers: { "X-Notrude-Fixture": "1" } });
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function startChat() {
  fireEvent.click(await screen.findByRole("button", { name: "Start a new chat" }));
  await waitFor(() => expect(nav.push).toHaveBeenCalled());
  nav.id = String(nav.push.mock.calls.at(-1)![0]).split("/").pop()!;
  nav.push.mockReset();
  return nav.id;
}

it("runs Fresh First → chat → plan update → archive → fresh chat → isolated coach switch", async () => {
  await saveCoachRelationship({ coachId: "river", learnedPreferences: [{ id: "river:reply_length", key: "reply_length", value: "short", evidence: "River private preference", learnedAt: now }], rejectedPatterns: [], declinedSwitchSuggestion: false, updatedAt: now });

  // Fresh First: nothing is said or requested before the user starts.
  let view = render(createElement(CoachPage));
  await screen.findByText("No previous chats with this coach yet.");
  expect(screen.queryByRole("textbox")).toBeNull();
  const first = await startChat();
  expect(calls).toEqual([]);
  view.unmount();

  // Active chat: empty until the user sends; an explicit instruction updates the plan.
  view = render(createElement(ChatPage));
  const input = await screen.findByRole("textbox", { name: "Message coach" });
  expect(input).toHaveValue("");
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: "Move my walk to Friday" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("Friday fits.");
  await waitFor(async () => expect((await getPlan())?.id).toBe("changed"));

  // Leaving Coach archives the session (CoachSessionLifecycle calls this on navigation).
  view.unmount();
  await archiveCoachConversation(first);
  expect(await getCoachConversation(first)).toMatchObject({ status: "archived", coachId: "river", resultLabels: expect.arrayContaining(["Plan updated"]) });

  // Back on Coach: the old chat is queued, and a new chat is a different empty record.
  view = render(createElement(CoachPage));
  expect(await screen.findByRole("link", { name: /Friday walk/ })).toHaveAttribute("href", `/coach/history/${first}`);
  expect(screen.queryByText("Friday fits.")).toBeNull();
  const second = await startChat();
  expect(second).not.toBe(first);
  expect(await getCoachConversation(second)).toMatchObject({ status: "active", messages: [] });
  view.unmount();

  // Switching coach: Jax has its own empty queue and memory.
  view = render(createElement(CoachPage));
  await screen.findByRole("link", { name: /Friday walk/ });
  fireEvent.click(screen.getByText("Change coach", { exact: false }));
  fireEvent.click(screen.getByRole("button", { name: /^Jax/ }));
  await screen.findByText("No previous chats with this coach yet.");
  expect(screen.queryByRole("link", { name: /Friday walk/ })).toBeNull();
  expect((await getCoachRelationship("jax")).learnedPreferences).toEqual([]);
  expect((await getCoachRelationship("river")).learnedPreferences).toHaveLength(1);
  expect((await listCoachConversations("jax")).filter((record) => record.status === "archived")).toEqual([]);
});
