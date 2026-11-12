// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppearanceControl } from "@/components/theme/AppearanceControl";
import type { UserProfile } from "@/lib/types";

const { saveProfile } = vi.hoisted(() => ({ saveProfile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/store", () => ({ saveProfile }));

const profile: UserProfile = {
  goalText: "Build consistency",
  constraints: "Knee-friendly",
  tone: "gentle",
  cadence: "brief",
  motivation: "process_focus",
  channels: ["in_app"],
  trackWeight: false,
  coachId: "nova",
  appearance: "light",
  createdAt: "2026-11-10T08:00:00.000Z",
};

describe("AppearanceControl", () => {
  it("offers all modes and saves only the changed appearance", async () => {
    const onChanged = vi.fn();
    render(createElement(AppearanceControl, { profile, onChanged }));

    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));

    const expected = { ...profile, appearance: "dark" };
    await waitFor(() => expect(saveProfile).toHaveBeenCalledWith(expected));
    expect(onChanged).toHaveBeenCalledWith(expected);
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
  });
});
