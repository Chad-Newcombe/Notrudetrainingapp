import { describe, it, expect } from "vitest";
import { EMPATHY_SYSTEM_RULES, assertNoShameCopy } from "@/lib/ai/empathy";

describe("empathy rules", () => {
  it("includes no-shame and open-ended goal guidance", () => {
    expect(EMPATHY_SYSTEM_RULES).toMatch(/never shame/i);
    expect(EMPATHY_SYSTEM_RULES).toMatch(/own words|open-ended/i);
    expect(EMPATHY_SYSTEM_RULES).toMatch(/injury|pain/i);
  });

  it("flags shaming phrases", () => {
    expect(assertNoShameCopy("You fell behind again")).toBe(false);
    expect(assertNoShameCopy("Glad you showed up today")).toBe(true);
  });
});
