"use client";

import { useEffect, type ReactNode } from "react";
import { getProfile } from "@/lib/store/profile";
import {
  THEME_CHANGE_EVENT,
  themeSelection,
  type ThemeSelection,
} from "@/lib/theme";

function applyTheme(selection: ThemeSelection) {
  document.documentElement.dataset.coach = selection.coachId;
  document.documentElement.dataset.appearance = selection.appearance;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let active = true;

    const onThemeChange = (event: Event) => {
      applyTheme((event as CustomEvent<ThemeSelection>).detail);
    };

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    void getProfile().then((profile) => {
      if (active) applyTheme(themeSelection(profile));
    });

    return () => {
      active = false;
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
    };
  }, []);

  return children;
}
