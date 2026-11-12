import { DEFAULT_COACH_ID } from "@/lib/coaches/presets";
import type { UserProfile } from "@/lib/types";
import { announceTheme, themeSelection } from "@/lib/theme";
import { readRecord, writeRecord } from "./storage";

const PROFILE_KEY = "profile";

export async function getProfile(): Promise<UserProfile | null> {
  const value = (await readRecord("meta", PROFILE_KEY)) as UserProfile | undefined;
  if (!value) return null;
  return {
    ...value,
    coachId: value.coachId ?? DEFAULT_COACH_ID,
    appearance: value.appearance ?? "system",
  };
}

export async function saveProfile(p: UserProfile): Promise<void> {
  await writeRecord("meta", PROFILE_KEY, p);
  announceTheme(themeSelection(p));
}
