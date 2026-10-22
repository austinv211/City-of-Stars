import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Swords } from "lucide-react";
import { TooltipProvider } from "@/core/components/ui/tooltip";
import { NavItem, type NavVariant } from "./NavItem";
import type { NavEntry } from "./navConfig";

const entry: NavEntry = {
  to: "/encounter",
  label: "Encounter",
  shortLabel: "Combat",
  icon: Swords,
  requiresEncounter: true,
};

function renderItem(
  props: Partial<React.ComponentProps<typeof NavItem>> = {},
  route = "/characters",
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <TooltipProvider>
        <NavItem entry={entry} variant="full" {...props} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("NavItem", () => {
  it("renders a link to its destination", () => {
    renderItem();
    expect(screen.getByRole("link", { name: /encounter/i })).toHaveAttribute(
      "href",
      "/encounter",
    );
  });

  // The whole point of the three variants is that the label survives in some
  // form at every density -- as text, or as an accessible name on the icon.
  it.each<[NavVariant, string]>([
    ["full", "Encounter"],
    ["tab", "Combat"],
  ])("shows the %s variant's visible label", (variant, text) => {
    renderItem({ variant });
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("keeps an accessible name on the icon-only rail variant", () => {
    renderItem({ variant: "icon" });
    const link = screen.getByRole("link", { name: "Encounter" });
    expect(link).toBeInTheDocument();
    // Icon-only: no visible text to read.
    expect(link).not.toHaveTextContent("Encounter");
  });

  it("marks the active route with aria-current", () => {
    renderItem({}, "/encounter");
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("does not mark an inactive route", () => {
    renderItem({}, "/characters");
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });

  describe("when disabled", () => {
    it("renders no link at all, so it cannot be navigated to", () => {
      renderItem({ disabled: true, disabledTip: "No active encounter" });
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("is marked aria-disabled", () => {
      renderItem({ disabled: true, disabledTip: "No active encounter" });
      expect(screen.getByText("Encounter").closest("[aria-disabled]")).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("explains why on hover", async () => {
      const user = userEvent.setup();
      renderItem({ disabled: true, disabledTip: "No active encounter" });
      await user.hover(screen.getByText("Encounter"));
      expect(await screen.findAllByText("No active encounter")).not.toHaveLength(0);
    });
  });

  it("calls onNavigate so a containing sheet can close itself", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    renderItem({ onNavigate });
    await user.click(screen.getByRole("link"));
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it("hides the live-encounter dot from assistive tech", () => {
    const { container } = renderItem({ showLiveDot: true });
    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });
});
