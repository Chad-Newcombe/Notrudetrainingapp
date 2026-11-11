import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { openDB } from "idb";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachConversation, UserProfile } from "@/lib/types";

const services = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/account/server", () => ({ getAccountServices: () => services.current }));

import { GET, POST } from "@/app/api/account/data/route";
import { clearAll, getDb } from "@/lib/store/db";
import {
  deleteCoachConversation, emptyCoachRelationship, getCoachConversation,
  getCoachRelationship, listCoachConversations, migrateLegacyChat,
  saveCoachConversation, saveCoachRelationship,
} from "@/lib/store";
import { appendChat, listChat } from "@/lib/store/chat";
import { guestRecords, importGuestData, readRecord, setStorageAccount } from "@/lib/store/storage";

const now = "2026-11-11T12:00:00.000Z";
const profile: UserProfile = {
  goalText: "Walk regularly", tone: "gentle", cadence: "brief", motivation: "process_focus",
  channels: ["in_app"], trackWeight: false, coachId: "nova", createdAt: now,
};
const conversation = (id: string, coachId: CoachConversation["coachId"], updatedAt = now): CoachConversation => ({
  id, coachId, status: "active", messages: [], resultLabels: [], createdAt: now, updatedAt,
});
const legacyMessage = { id: "old-user", role: "user" as const, content: "Walking is hard", createdAt: now };
let accountDb: DatabaseSync;

beforeEach(async () => {
  setStorageAccount(null);
  await clearAll();
  accountDb = new DatabaseSync(":memory:");
  accountDb.exec("CREATE TABLE coaching_record (user_id TEXT, collection TEXT, record_key TEXT, payload TEXT, PRIMARY KEY(user_id, collection, record_key))");
  services.current = {
    db: accountDb, origin: "https://notrude.test",
    auth: { api: { getSession: async () => ({ user: { id: "account-one" } }) } },
  };
});
afterEach(() => { setStorageAccount(null); accountDb.close(); vi.unstubAllGlobals(); });

function useAccount() {
  setStorageAccount("account-one");
  vi.stubGlobal("fetch", async (path: string, init: RequestInit) => {
    const request = new Request(new URL(path, "https://notrude.test"), {
      ...init, headers: { ...init.headers, origin: "https://notrude.test" },
    });
    return init.method === "POST" ? POST(request) : GET(request);
  });
}

for (const mode of ["guest", "account"] as const) {
  describe(`${mode} coach storage`, () => {
    beforeEach(() => { if (mode === "account") useAccount(); });

    it("replaces whole conversations, filters by coach, and sorts newest first", async () => {
      await saveCoachConversation(conversation("older", "river", "2026-11-10T12:00:00.000Z"));
      await saveCoachConversation(conversation("other-coach", "jax"));
      await saveCoachConversation({ ...conversation("newer", "river"), messages: [legacyMessage] });
      await saveCoachConversation(conversation("newer", "river"));
      expect((await listCoachConversations("river")).map(({ id }) => id)).toEqual(["newer", "older"]);
      expect(await listCoachConversations()).toHaveLength(3);
      expect((await getCoachConversation("newer"))?.messages).toEqual([]);
    });

    it("deletes only the exact conversation and leaves relationships intact", async () => {
      await saveCoachConversation(conversation("one", "river"));
      await saveCoachConversation(conversation("one-more", "river"));
      await saveCoachRelationship({ ...emptyCoachRelationship("river", now), declinedSwitchSuggestion: true });
      await deleteCoachConversation("one");
      expect(await getCoachConversation("one")).toBeUndefined();
      expect((await listCoachConversations()).map(({ id }) => id)).toEqual(["one-more"]);
      expect((await getCoachRelationship("river")).declinedSwitchSuggestion).toBe(true);
    });

    it("returns isolated empty relationships and round-trips learned evidence", async () => {
      const learned = {
        ...emptyCoachRelationship("nova", now),
        learnedPreferences: [{ id: "pref-1", key: "questions", value: "Fewer questions", evidence: "Ask me less", learnedAt: now }],
      };
      await saveCoachRelationship(learned);
      expect(await getCoachRelationship("nova")).toEqual(learned);
      expect(await getCoachRelationship("jax")).toEqual({
        coachId: "jax", learnedPreferences: [], rejectedPatterns: [], declinedSwitchSuggestion: false,
        updatedAt: expect.any(String),
      });
    });

    it("migrates legacy chat once to the selected coach as an archived conversation", async () => {
      await appendChat(legacyMessage);
      await migrateLegacyChat(profile);
      await migrateLegacyChat({ ...profile, coachId: "jax" });
      expect(await listCoachConversations()).toEqual([expect.objectContaining({
        coachId: "nova", status: "archived", title: "Legacy conversation", messages: [legacyMessage], archivedAt: expect.any(String),
      })]);
      expect(await readRecord("meta", "coach-conversation-migration-v2")).toBe(true);
      expect(await listChat()).toEqual([legacyMessage]);
    });

    it("preserves a legacy archive larger than the active conversation limit", async () => {
      for (let index = 0; index < 201; index++) await appendChat({ ...legacyMessage, id: `old-${index}` });
      await migrateLegacyChat(profile);
      await migrateLegacyChat(profile);
      const archives = await listCoachConversations();
      expect(archives).toHaveLength(1);
      expect(archives[0].status).toBe("archived");
      expect(archives[0].messages).toHaveLength(201);
      expect(await readRecord("meta", "coach-conversation-migration-v2")).toBe(true);
    });

    it("keeps legacy data and the migration retryable for an oversized message", async () => {
      const oversized = { ...legacyMessage, content: "x".repeat(24_001) };
      if (mode === "guest") await (await getDb()).put("chat", oversized);
      else accountDb.prepare("INSERT INTO coaching_record VALUES (?, ?, ?, ?)")
        .run("account-one", "chat", oversized.id, JSON.stringify(oversized));
      await expect(migrateLegacyChat(profile)).rejects.toThrow("A record could not be saved.");
      expect(await readRecord("meta", "coach-conversation-migration-v2")).toBeUndefined();
      expect(await listCoachConversations()).toEqual([]);
      expect(await listChat()).toEqual([oversized]);
    });

    it("marks empty legacy chat migrated without creating a conversation", async () => {
      await migrateLegacyChat(profile);
      await appendChat(legacyMessage);
      await migrateLegacyChat(profile);
      expect(await listCoachConversations()).toEqual([]);
      expect(await readRecord("meta", "coach-conversation-migration-v2")).toBe(true);
    });
  });
}

it("exports and imports both coach stores and migration metadata, then clears the guest stores", async () => {
  await saveCoachConversation(conversation("guest-session", "sol"));
  await saveCoachRelationship(emptyCoachRelationship("sol", now));
  await migrateLegacyChat(profile);
  const records = await guestRecords();
  expect(records).toEqual(expect.arrayContaining([
    expect.objectContaining({ collection: "coachConversations", key: "guest-session" }),
    expect.objectContaining({ collection: "coachRelationships", key: "sol" }),
    { collection: "meta", key: "coach-conversation-migration-v2", value: true },
  ]));
  useAccount();
  await importGuestData(records);
  expect((await listCoachConversations()).map(({ id }) => id)).toEqual(["guest-session"]);
  expect((await getCoachRelationship("sol")).coachId).toBe("sol");
  expect(await readRecord("meta", "coach-conversation-migration-v2")).toBe(true);
  setStorageAccount(null);
  await clearAll();
  expect(await guestRecords()).toEqual([]);
});

it("falls back to an empty relationship for corrupt device data", async () => {
  await (await getDb()).put("coachRelationships", { coachId: "river", learnedPreferences: "bad" } as never);
  expect((await getCoachRelationship("river")).learnedPreferences).toEqual([]);
});

function post(body: unknown, origin = "https://notrude.test") {
  return POST(new Request("https://notrude.test/api/account/data", {
    method: "POST", headers: { "content-type": "application/json", origin, "x-notrude-account": "account-one" },
    body: JSON.stringify(body),
  }));
}
it("validates all batch records before any writes and rejects invalid deletes and origins", async () => {
  const valid = { collection: "coachConversations", key: "valid", value: conversation("valid", "river") };
  expect((await post({ action: "putMany", records: [valid, { ...valid, key: "mismatch" }] })).status).toBe(400);
  expect(accountDb.prepare("SELECT COUNT(*) AS n FROM coaching_record").get()?.n).toBe(0);
  for (const body of [
    { action: "delete", collection: "unknown", key: "valid" },
    { action: "delete", collection: "coachConversations", key: "" },
    { action: "delete", collection: "coachRelationships", key: "not-a-coach" },
  ]) expect((await post(body)).status).toBe(400);
  expect((await post({ action: "put", record: valid }, "https://evil.test")).status).toBe(403);
  expect((await post({ action: "putMany", records: [valid] })).status).toBe(200);
  expect(accountDb.prepare("SELECT COUNT(*) AS n FROM coaching_record").get()?.n).toBe(1);
});


it("upgrades a version-one database while preserving legacy chat", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  const oldDb = await openDB("notrude", 1, {
    upgrade(db) { db.createObjectStore("chat", { keyPath: "id" }); },
  });
  await oldDb.put("chat", legacyMessage);
  oldDb.close();
  vi.resetModules();
  const upgraded = await (await import("@/lib/store/db")).getDb();
  expect(await upgraded.get("chat", "old-user")).toEqual(legacyMessage);
  expect(upgraded.transaction("coachConversations").store.keyPath).toBe("id");
  expect(upgraded.transaction("coachRelationships").store.keyPath).toBe("coachId");
  upgraded.close();
});

it("scopes exact deletion to the authorized account and collection", async () => {
  const insert = accountDb.prepare("INSERT INTO coaching_record VALUES (?, ?, ?, ?)");
  insert.run("account-one", "coachConversations", "same", JSON.stringify(conversation("same", "river")));
  insert.run("account-two", "coachConversations", "same", JSON.stringify(conversation("same", "river")));
  insert.run("account-one", "chat", "same", JSON.stringify({ ...legacyMessage, id: "same" }));
  expect((await post({ action: "delete", collection: "coachConversations", key: "same" })).status).toBe(200);
  expect(accountDb.prepare("SELECT user_id, collection FROM coaching_record ORDER BY user_id").all()).toEqual([
    { user_id: "account-one", collection: "chat" },
    { user_id: "account-two", collection: "coachConversations" },
  ]);
});
