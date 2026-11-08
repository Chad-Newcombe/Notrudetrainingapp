import type { UserProfile } from "@/lib/types";
import { getDb } from "./db";

const PROFILE_KEY = "profile";

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDb();
  const value = await db.get("meta", PROFILE_KEY);
  return (value as UserProfile | undefined) ?? null;
}

export async function saveProfile(p: UserProfile): Promise<void> {
  const db = await getDb();
  await db.put("meta", p, PROFILE_KEY);
}
