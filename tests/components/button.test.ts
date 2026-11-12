// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Button, type ButtonProps } from "@/components/ui/Button";

describe("Button", () => {
  it("uses accessible semantic theme surfaces without an offset shadow", () => {
    const primaryProps: ButtonProps = { children: "Start workout" };
    const secondaryProps: ButtonProps = { variant: "ghost", children: "Not now" };
    render(
      createElement(
        "div",
        null,
        createElement(Button, primaryProps),
        createElement(Button, secondaryProps),
      ),
    );

    const primary = screen.getByRole("button", { name: "Start workout" });
    const secondary = screen.getByRole("button", { name: "Not now" });

    expect(primary.className).toContain("min-h-11");
    expect(primary.className).toContain("bg-[var(--app-accent)]");
    expect(primary.className).toContain("text-[var(--app-on-accent)]");
    expect(primary.className).toContain("focus-visible:outline-[var(--app-focus)]");
    expect(secondary.className).toContain("bg-[var(--app-raised)]");
    expect(primary.className).not.toContain("shadow-[4px_4px");
    expect(secondary.className).not.toContain("shadow-[4px_4px");
  });
});
