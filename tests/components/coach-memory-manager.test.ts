// @vitest-environment jsdom
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { CoachMemoryManager } from "@/components/coach/CoachMemoryManager";
import { promoteSharedFact } from "@/components/coach/ConfirmSharedFact";
import { clearAll, getCoachConversation, getCoachRelationship, getProfile, saveCoachConversation, saveCoachRelationship, saveProfile } from "@/lib/store";
import { getDb } from "@/lib/store/db";
import { setStorageAccount } from "@/lib/store/storage";
import type { CoachConversation, CoachRelationship, UserProfile } from "@/lib/types";

const now = "2026-11-11T12:00:00.000Z";
const profile: UserProfile = { goalText: "Walk", constraints: "Bad knee", tone: "gentle", cadence: "brief", motivation: "process_focus", channels: ["in_app"], trackWeight: false, coachId: "river", createdAt: now };
const river: CoachRelationship = { coachId: "river", updatedAt: now, declinedSwitchSuggestion: true, rejectedPatterns: ["pep talks"], learnedPreferences: [
  { id: "river:reply_length", key: "reply_length", value: "short", evidence: "Keep it short", learnedAt: now },
  { id: "river:ability_distance", key: "ability_distance", value: "Three miles is comfortable", evidence: "I ran three miles easily", learnedAt: now },
] };
const jax: CoachRelationship = { coachId: "jax", updatedAt: now, declinedSwitchSuggestion: false, rejectedPatterns: [], learnedPreferences: [
  { id: "jax:reassurance", key: "reassurance", value: "none", evidence: "Skip the cheering", learnedAt: now },
] };
const chat: CoachConversation = { id: "archive-one", coachId: "river", status: "archived", messages: [{ id: "m", role: "user", content: "Keep it short", createdAt: now }], resultLabels: [], createdAt: now, updatedAt: now, archivedAt: now };

beforeEach(async () => { setStorageAccount(null); await clearAll(); await saveProfile(profile); await saveCoachRelationship(river); await saveCoachRelationship(jax); await saveCoachConversation(chat); });
afterEach(cleanup);
const group = (name: string) => screen.findByRole("region", { name: `${name}'s memory` });

it("groups literal entries by coach", async () => {
  render(createElement(CoachMemoryManager));
  const riverGroup = within(await group("River"));
  expect(riverGroup.getByText("Reply length: short")).toBeVisible();
  expect(riverGroup.getByText("You said: “Keep it short”")).toBeVisible();
  expect(riverGroup.getByText("Avoids: pep talks")).toBeVisible();
  expect(riverGroup.queryByText(/Skip the cheering/)).toBeNull();
  expect(within(await group("Jax")).getByText("You said: “Skip the cheering”")).toBeVisible();
  expect(within(await group("Sol")).getByText("Nothing saved yet.")).toBeVisible();
  expect(document.body.textContent).not.toMatch(/Immutable core|Cannot become/);
});

it("removes one entry without touching transcripts or other memory", async () => {
  render(createElement(CoachMemoryManager));
  fireEvent.click(await screen.findByRole("button", { name: "Remove from River's memory: Reply length" }));
  await waitFor(() => expect(screen.queryByText("Reply length: short")).toBeNull());
  const saved = await getCoachRelationship("river");
  expect(saved.learnedPreferences.map((entry) => entry.id)).toEqual(["river:ability_distance"]);
  expect(saved.rejectedPatterns).toEqual(["pep talks"]);
  expect(saved.declinedSwitchSuggestion).toBe(true);
  expect(await getCoachRelationship("jax")).toEqual(jax);
  expect(await getCoachConversation("archive-one")).toEqual(chat);
  fireEvent.click(screen.getByRole("button", { name: "Remove from River's memory: stay choice" }));
  await waitFor(async () => expect((await getCoachRelationship("river")).declinedSwitchSuggestion).toBe(false));
});

it("shows a safe empty state for corrupt memory", async () => {
  const db = await getDb();
  await db.put("coachRelationships", { coachId: "river", learnedPreferences: "broken" } as never);
  render(createElement(CoachMemoryManager));
  expect(within(await group("River")).getByText("Nothing saved yet.")).toBeVisible();
});

it("keeps a fact coach-local until the user shares it, then appends it once", async () => {
  render(createElement(CoachMemoryManager));
  const share = await screen.findByRole("button", { name: "Share “Three miles is comfortable” with all coaches" });
  expect((await getProfile())?.sharedFacts).toBeUndefined();
  fireEvent.click(share);
  await screen.findByText("Shared with all coaches.");
  const saved = await getProfile();
  expect(saved?.sharedFacts).toMatchObject([{ category: "ability", statement: "Three miles is comfortable" }]);
  expect(saved?.constraints).toBe("Bad knee");
  expect(await getCoachRelationship("river")).toEqual(river);
});

it("deduplicates equivalent facts and rejects invalid candidates", () => {
  const candidate = { coachId: "river" as const, category: "ability" as const, statement: "Three miles is comfortable", evidence: "x" };
  const once = promoteSharedFact(profile, candidate, now);
  expect(once.sharedFacts).toHaveLength(1);
  expect(promoteSharedFact(once, { ...candidate, statement: "  three miles  is comfortable " }, now)).toBe(once);
  expect(promoteSharedFact(once, { ...candidate, category: "schedule" }, now).sharedFacts).toHaveLength(2);
  expect(promoteSharedFact(profile, { ...candidate, statement: "x".repeat(221) }, now)).toBe(profile);
  expect(promoteSharedFact(profile, { ...candidate, category: "personality" as never }, now)).toBe(profile);
});
