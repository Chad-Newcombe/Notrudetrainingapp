// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { BOOT_SCRIPT } from "@/components/shell/BootSplash";

const boot = () => new Function(BOOT_SCRIPT)();

describe("launch theme", () => {
  it("opens in the last coach's colors before React loads", () => {
    document.documentElement.dataset.coach = "river";
    localStorage.setItem("notrude-theme", JSON.stringify({ coachId: "jax", appearance: "dark" }));
    boot();
    expect(document.documentElement.dataset.coach).toBe("jax");
    expect(document.documentElement.dataset.appearance).toBe("dark");
  });

  it("ignores a missing or tampered value", () => {
    document.documentElement.dataset.coach = "river";
    localStorage.setItem("notrude-theme", JSON.stringify({ coachId: "\"><script>", appearance: "neon" }));
    boot();
    localStorage.setItem("notrude-theme", "not json");
    boot();
    expect(document.documentElement.dataset.coach).toBe("river");
  });
});
