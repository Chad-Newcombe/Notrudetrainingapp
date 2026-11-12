// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { announceTheme, themeSelection } from "@/lib/theme";

describe("themeSelection", () => {
  it("uses River and the system appearance before a profile exists", () => {
    expect(themeSelection(null)).toEqual({ coachId: "river", appearance: "system" });
  });

  it.each(["river", "jax", "sol", "nova"] as const)(
    "keeps the %s coach while normalizing a missing appearance",
    (coachId) => {
      expect(themeSelection({ coachId })).toEqual({ coachId, appearance: "system" });
    },
  );
});

describe("announceTheme", () => {
  it("dispatches the normalized selection to browser listeners", () => {
    const dispatchEvent = vi.spyOn(window, "dispatchEvent");
    announceTheme({ coachId: "sol", appearance: "light" });

    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0]).toMatchObject({
      type: "notrude-theme-change",
      detail: { coachId: "sol", appearance: "light" },
    });
  });
});
