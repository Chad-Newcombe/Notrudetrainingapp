// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoachStage } from "@/components/coach/CoachStage";

describe("CoachStage", () => {
  it("renders a static editorial portrait without a 3D loading or drag interaction", () => {
    const { container } = render(createElement(CoachStage, {
      coachId: "river",
      label: "Your coach · River",
      title: "In your corner",
    }));

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("src", expect.stringContaining("river-editorial.png"));
    expect(screen.queryByText(/loading.*3d|drag to rotate/i)).not.toBeInTheDocument();
    expect(container.querySelector("model-viewer")).not.toBeInTheDocument();
  });
});
