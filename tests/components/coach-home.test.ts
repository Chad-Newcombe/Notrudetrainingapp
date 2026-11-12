// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CoachPage from "@/app/(main)/coach/page";
import { appendChat, clearAll, listCoachConversations, saveCoachConversation, saveProfile } from "@/lib/store";
import { setStorageAccount } from "@/lib/store/storage";
import type { CoachConversation, UserProfile } from "@/lib/types";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const now = "2026-11-11T12:00:00.000Z";
const profile: UserProfile = {
  goalText: "Walk regularly", tone: "gentle", cadence: "brief", motivation: "process_focus",
  channels: ["in_app"], trackWeight: false, coachId: "river", createdAt: now,
};
const archive = (id: string, coachId: CoachConversation["coachId"], updatedAt: string): CoachConversation => ({
  id, coachId, status: "archived", title: id, summary: `${id} summary`, resultLabels: ["Plan updated"],
  messages: [{ id: `${id}-message`, role: "assistant", content: `${id} private reply`, createdAt: now }],
  createdAt: now, updatedAt, archivedAt: updatedAt,
});

beforeEach(async () => {
  HTMLElement.prototype.scrollTo = () => {};
  setStorageAccount(null);
  await clearAll();
  await saveProfile(profile);
  navigation.push.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected network request")));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Fresh First coach landing", () => {
  it("puts a new-chat action above only the selected coach's newest-first archived queue", async () => {
    await saveCoachConversation(archive("Older River chat", "river", "2026-11-10T12:00:00.000Z"));
    await saveCoachConversation(archive("Newest River chat", "river", now));
    await saveCoachConversation(archive("Private Jax chat", "jax", now));
    await saveCoachConversation({ ...archive("Unfinished chat", "river", now), status: "active", archivedAt: undefined });
    render(createElement(CoachPage));
    const start = await screen.findByRole("button", { name: "Start a new chat" });
    const queue = await screen.findByRole("list", { name: "Previous chats" });
    expect(within(queue).getAllByRole("listitem").map((row) => within(row).getByRole("link").textContent))
      .toEqual([expect.stringContaining("Newest River chat"), expect.stringContaining("Older River chat")]);
    expect(start.compareDocumentPosition(queue) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("River");
    expect(screen.getAllByText("Plan updated")).toHaveLength(2);
    expect(screen.getByText("Newest River chat summary")).toBeInTheDocument();
    expect(queue.querySelector("time")).toHaveAttribute("datetime", now);
    expect(screen.queryByText("Private Jax chat")).not.toBeInTheDocument();
    expect(screen.queryByText("Unfinished chat")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/private reply/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("button").filter((button) => !button.closest("details")).map((button) => button.textContent)).toEqual(["Start a new chat"]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("creates an empty selected-coach conversation and navigates without calling the model", async () => {
    render(createElement(CoachPage));
    fireEvent.click(await screen.findByRole("button", { name: "Start a new chat" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const records = await listCoachConversations();
    expect(records).toEqual([expect.objectContaining({ coachId: "river", status: "active", messages: [], resultLabels: [] })]);
    expect(records[0].continuedFromId).toBeUndefined();
    expect(navigation.push).toHaveBeenCalledWith(`/coach/chat/${records[0].id}`);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("changes identity, action owner, and queue together when selecting another coach", async () => {
    await saveCoachConversation(archive("River only", "river", now));
    await saveCoachConversation(archive("Jax only", "jax", now));
    render(createElement(CoachPage));
    await screen.findByText("River only summary");
    fireEvent.click(screen.getByText("Change coach", { exact: false }));
    fireEvent.click(screen.getByRole("button", { name: /^Jax/ }));
    await screen.findByText("Jax only summary");
    expect(screen.queryByText("River only summary")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Jax");
    fireEvent.click(screen.getByRole("button", { name: "Start a new chat" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    expect((await listCoachConversations()).find((record) => record.status === "active")?.coachId).toBe("jax");
  });

  it("shows migrated legacy messages only as archived history", async () => {
    await appendChat({ id: "legacy", role: "assistant", content: "Old global assistant reply", createdAt: now });
    render(createElement(CoachPage));
    expect(await screen.findByRole("link", { name: /Legacy conversation/ })).toHaveAttribute("href", "/coach/history/legacy-chat-v2");
    expect(screen.queryByText("Old global assistant reply")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
