import { DEFAULT_COACH_ID } from "@/lib/coaches/presets";
import type { UserProfile } from "@/lib/types";
import { getDb } from "./db";

const PROFILE_KEY = "profile";

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const value = (await db.get("meta", PROFILE_KEY)) as UserProfile | undefined;
  if (!value) return null;
  return { ...value, coachId: value.coachId ?? DEFAULT_COACH_ID };
}

export async function saveProfile(p: UserProfile): Promise<void> {
  const db = await getDb();
  await db.put("meta", p, PROFILE_KEY);
}
