// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { expect, it } from "vitest";
import { CoachStage } from "@/components/coach/CoachStage";
import { COACH_PRESETS } from "@/lib/coaches/presets";

it("shows each coach as its own orb with no 3D viewer or drag hint", () => {
  for (const coach of COACH_PRESETS) {
    const { container, unmount } = render(createElement(CoachStage, { coachId: coach.id, label: "Your coach", title: coach.name, replying: coach.id === "riff" }));
    expect(screen.getByRole("heading", { name: coach.name })).toBeInTheDocument();
    const orb = container.querySelector(".coach-orb") as HTMLElement;
    expect(orb).toHaveAttribute("data-coach", coach.id);
    expect(orb.style.getPropertyValue("--orb")).toBe(coach.accent);
    expect(orb.hasAttribute("data-replying")).toBe(coach.id === "riff");
    expect(container.querySelector("model-viewer")).toBeNull();
    expect(screen.queryByText("Drag to rotate")).toBeNull();
    unmount();
  }
});
