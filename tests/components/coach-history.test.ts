// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HistoryPage from "@/app/(main)/coach/history/[conversationId]/page";
import ChatPage from "@/app/(main)/coach/chat/[conversationId]/page";
import { appendChat, clearAll, getCoachConversation, listCoachConversations, saveCoachConversation, saveProfile } from "@/lib/store";
import { setStorageAccount } from "@/lib/store/storage";
import type { CoachConversation, UserProfile } from "@/lib/types";

const navigation = vi.hoisted(() => ({ push: vi.fn(), id: "archive-one" }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation, useParams: () => ({ conversationId: navigation.id }) }));
vi.mock("@/components/coach/CoachModelPreview", () => ({ CoachModelPreview: () => null }));
const now = "2026-11-11T12:00:00.000Z";
const profile: UserProfile = {
  goalText: "Walk regularly", tone: "gentle", cadence: "brief", motivation: "process_focus",
  channels: ["in_app"], trackWeight: false, coachId: "river", createdAt: now,
};
const archived: CoachConversation = {
  id: "archive-one", coachId: "river", status: "archived", title: "Shorter walks",
  summary: "Requested shorter walks for this week.", resultLabels: ["Plan updated", "Schedule saved"],
  messages: [
    { id: "user-first", role: "user", content: "Make the walks shorter.", createdAt: now },
    { id: "assistant-second", role: "assistant", content: "The walks are now 15 minutes.", createdAt: now },
    { id: "user-last", role: "user", content: "Keep the same days.", createdAt: now },
  ], createdAt: now, updatedAt: now, archivedAt: now,
};
beforeEach(async () => {
  HTMLElement.prototype.scrollTo = () => {};
  setStorageAccount(null);
  await clearAll();
  await saveProfile(profile);
  navigation.id = "archive-one";
  navigation.push.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected network request")));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("archived coach history", () => {
  it("renders literal ordered messages and results with no live composer or mutation", async () => {
    await saveCoachConversation(archived);
    render(createElement(HistoryPage));
    await screen.findByRole("heading", { name: "Shorter walks" });
    expect(screen.getByRole("log", { name: "Archived conversation" }).textContent)
      .toMatch(/Make the walks shorter\.[\s\S]*The walks are now 15 minutes\.[\s\S]*Keep the same days\./);
    expect(screen.getByText("Plan updated")).toBeInTheDocument();
    expect(screen.getByText("Schedule saved")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send" })).not.toBeInTheDocument();
    expect(await getCoachConversation("archive-one")).toEqual(archived);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("continues into a different empty active record linked only by the archived ID", async () => {
    await saveCoachConversation(archived);
    render(createElement(HistoryPage));
    fireEvent.click(await screen.findByRole("button", { name: "Continue from here" }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledTimes(1));
    const records = await listCoachConversations();
    const active = records.find((record) => record.status === "active")!;
    expect(active).toMatchObject({ coachId: "river", messages: [], resultLabels: [], continuedFromId: "archive-one" });
    expect(active.id).not.toBe("archive-one");
    expect(active.title).toBeUndefined();
    expect(active.summary).toBeUndefined();
    expect(navigation.push).toHaveBeenCalledWith(`/coach/chat/${active.id}`);
    expect(await getCoachConversation("archive-one")).toEqual(archived);
    expect(fetch).not.toHaveBeenCalled();
  });

  for (const kind of ["missing", "active", "wrong coach"] as const) {
    it(`rejects ${kind} history without exposing any transcript`, async () => {
      if (kind !== "missing") await saveCoachConversation({ ...archived, ...(kind === "active" ? { status: "active" as const, archivedAt: undefined } : { coachId: "jax" as const }) });
      render(createElement(HistoryPage));
      expect(await screen.findByRole("link", { name: "Back to Coach" })).toHaveAttribute("href", "/coach");
      expect(screen.queryByText("Make the walks shorter.")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Continue from here" })).not.toBeInTheDocument();
    });
  }
});

describe("exact active coach route", () => {
  it("loads only the requested record and leaves a new chat empty and focused", async () => {
    await saveCoachConversation(archived);
    await appendChat({ id: "global", role: "assistant", content: "Unrelated legacy transcript", createdAt: now });
    await saveCoachConversation({ id: "active-one", coachId: "river", status: "active", messages: [], resultLabels: [], createdAt: now, updatedAt: now });
    navigation.id = "active-one";
    render(createElement(ChatPage));
    expect(await screen.findByRole("textbox", { name: "Message coach" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Message coach" })).toHaveFocus();
    expect(screen.queryByText("Unrelated legacy transcript")).not.toBeInTheDocument();
    expect(screen.queryByText("Make the walks shorter.")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads a requested active transcript without reading another active record", async () => {
    await saveCoachConversation({ ...archived, id: "active-one", status: "active", archivedAt: undefined });
    await saveCoachConversation({ ...archived, id: "active-two", status: "active", archivedAt: undefined, messages: [{ id: "other", role: "assistant", content: "Other active transcript", createdAt: now }] });
    navigation.id = "active-one";
    render(createElement(ChatPage));
    await screen.findByText("Make the walks shorter.");
    expect(screen.queryByText("Other active transcript")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  for (const kind of ["missing", "archived", "wrong coach"] as const) {
    it(`rejects ${kind} active routes`, async () => {
      if (kind !== "missing") await saveCoachConversation({ ...archived, ...(kind === "wrong coach" ? { status: "active" as const, archivedAt: undefined, coachId: "jax" as const } : {}) });
      render(createElement(ChatPage));
      expect(await screen.findByRole("link", { name: "Back to Coach" })).toHaveAttribute("href", "/coach");
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByText("Make the walks shorter.")).not.toBeInTheDocument();
    });
  }
});
