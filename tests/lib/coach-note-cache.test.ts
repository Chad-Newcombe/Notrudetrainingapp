import { afterEach, expect, it, vi } from "vitest";
import type { CoachNote, UserProfile, WorkoutLog } from "@/lib/types";

const saved: Record<string, CoachNote> = {};
vi.mock("@/lib/store", () => ({
  getCoachNotes: async () => saved,
  saveCoachNote: async (kind: string, note: CoachNote) => { saved[kind] = note; },
  getCoachRelationship: async () => null,
}));
const { coachNote } = await import("@/lib/coach/notes");

afterEach(() => vi.unstubAllGlobals());

it("writes a new weekly note once a session is logged, and reuses it until then", async () => {
  let n = 0;
  const fetch = vi.fn(async () => Response.json({ message: `note ${++n}` }));
  vi.stubGlobal("fetch", fetch);
  const profile = { coachId: "knox" } as UserProfile;
  const now = new Date("2026-11-19T12:00:00");

  const before = await coachNote("weekly", { profile, plan: null, history: [], logs: [] }, now);
  const again = await coachNote("weekly", { profile, plan: null, history: [], logs: [] }, now);
  const after = await coachNote("weekly", { profile, plan: null, history: [], logs: [{} as WorkoutLog] }, now);

  expect([before.text, again.text, after.text]).toEqual(["note 1", "note 1", "note 2"]);
  expect(fetch).toHaveBeenCalledTimes(2);
});
