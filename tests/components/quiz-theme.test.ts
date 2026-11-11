// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { QuizWizard } from "@/components/quiz/QuizWizard";

const { announceTheme } = vi.hoisted(() => ({ announceTheme: vi.fn() }));
vi.mock("@/lib/theme", () => ({ announceTheme }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("quiz coach theme", () => {
  it("previews the selected coach palette without human portraits or expanded 3D copy", () => {
    const { container } = render(createElement(QuizWizard, { profile: null, hasPlan: false }));

    fireEvent.click(screen.getByRole("button", { name: /Nova/i }));

    expect(announceTheme).toHaveBeenCalledWith({ coachId: "nova", appearance: "system" });
    expect(container.innerHTML).not.toContain("editorial.png");
    expect(screen.queryByText(/3d preview|drag to rotate/i)).not.toBeInTheDocument();
  });
});
