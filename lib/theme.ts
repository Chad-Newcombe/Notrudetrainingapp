import { DEFAULT_COACH_ID } from "@/lib/coaches/presets";
import type { AppearanceMode, CoachId, UserProfile } from "@/lib/types";

export const THEME_CHANGE_EVENT = "notrude-theme-change";

export type ThemeSelection = {
  coachId: CoachId;
  appearance: AppearanceMode;
};

export function themeSelection(
  profile?: Pick<UserProfile, "coachId" | "appearance"> | null,
): ThemeSelection {
  return {
    coachId: profile?.coachId ?? DEFAULT_COACH_ID,
    appearance: profile?.appearance ?? "system",
  };
}

export function announceTheme(selection: ThemeSelection): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: selection }));
}
