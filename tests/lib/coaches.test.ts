import { describe, it, expect } from "vitest";
import { COACH_PRESETS, getCoach } from "@/lib/coaches/presets";

describe("coach presets", () => {
  it("ships six presets without moss", () => {
    expect(COACH_PRESETS.map((c) => c.id)).toEqual([
      "river",
      "jax",
      "sol",
      "nova",
      "knox",
      "riff",
    ]);
    expect(COACH_PRESETS.some((c) => c.name === "Moss")).toBe(false);
  });

  it("falls back to river for unknown ids", () => {
    expect(getCoach(undefined).id).toBe("river");
  });
});
