import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { TooltipProvider } from "@/core/components/ui/tooltip";
import { MobileNav } from "./MobileNav";

// A DM sees the More panel's DM tiles; the two contexts are plain values.
vi.mock("@/core/context/CampaignContext", () => ({
  useCampaign: () => ({ isDM: true, activeEncounterId: null, campaign: null }),
}));
vi.mock("@/core/context/AuthContext", () => ({
  useAuth: () => ({
    isAdmin: false,
    isPlayerRole: true,
    displayName: "Dee Em",
    user: { email: "dm@test.local" },
    signOut: vi.fn(),
  }),
}));

/** MobileNav on /characters, after a first page, so there is history to go back through. */
function renderNav() {
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <TooltipProvider>
            <MobileNav onOpenAccount={vi.fn()} />
          </TooltipProvider>
        ),
      },
    ],
    { initialEntries: ["/campaigns", "/characters"], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const morePanel = () => screen.queryByRole("dialog", { name: "More" });

describe("MobileNav's More panel", () => {
  it("closes on back, staying on the same page", async () => {
    const router = renderNav();
    await userEvent.click(screen.getByRole("button", { name: "More navigation" }));
    expect(morePanel()).toBeInTheDocument();

    // What Android's back gesture does: wry calls history.back().
    await act(() => router.navigate(-1));
    await waitFor(() => {
      expect(morePanel()).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe("/characters");
  });

  it("closes with its close button the same way", async () => {
    const router = renderNav();
    await userEvent.click(screen.getByRole("button", { name: "More navigation" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => {
      expect(morePanel()).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe("/characters");
    // Back again now leaves the page, as there's no panel entry left over.
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/campaigns");
  });

  it("replaces its own history entry when a tile is chosen", async () => {
    const router = renderNav();
    await userEvent.click(screen.getByRole("button", { name: "More navigation" }));
    await userEvent.click(screen.getByRole("link", { name: /session manager/i }));
    await waitFor(() => {
      expect(morePanel()).not.toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe("/dm/sessions");
    // Back returns to the page More was opened on, not to the panel.
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe("/characters");
    expect(morePanel()).not.toBeInTheDocument();
  });
});
