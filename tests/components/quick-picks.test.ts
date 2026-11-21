import { expect, it } from "vitest";
import { togglePick } from "@/components/quiz/QuickPicks";

it("adds a tapped option after typed text and removes it on a second tap", () => {
  const added = togglePick("Night shifts", "Mornings work best");
  expect(added).toBe("Night shifts; Mornings work best");
  expect(togglePick(added, "Mornings work best")).toBe("Night shifts");
});

it("keeps the answer unchanged when an option would pass the length limit", () => {
  const long = "x".repeat(595);
  expect(togglePick(long, "Shift work")).toBe(long);
});
