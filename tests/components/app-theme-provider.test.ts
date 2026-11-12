// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { announceTheme } from "@/lib/theme";

const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));

vi.mock("@/lib/store/profile", () => ({ getProfile }));

describe("AppThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.dataset.coach = "river";
    document.documentElement.dataset.appearance = "system";
    getProfile.mockResolvedValue({ coachId: "nova", appearance: "dark" });
  });

  it("applies the stored theme and responds to changes without navigation", async () => {
    render(createElement(AppThemeProvider, null, createElement("p", null, "Ready")));

    await waitFor(() => {
      expect(document.documentElement.dataset.coach).toBe("nova");
      expect(document.documentElement.dataset.appearance).toBe("dark");
    });

    act(() => announceTheme({ coachId: "river", appearance: "dark" }));

    expect(document.documentElement.dataset.coach).toBe("river");
    expect(document.documentElement.dataset.appearance).toBe("dark");
  });
});
