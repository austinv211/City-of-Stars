import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "@/core/components/ui/tooltip";
import { NavSections } from "./NavSections";

// Role gating is the thing under test, so the two contexts it reads are
// replaced with plain values each test sets.
const roles = { isDM: false, isAdmin: false, isPlayerRole: true };

vi.mock("@/core/context/CampaignContext", () => ({
  useCampaign: () => ({ isDM: roles.isDM, activeEncounterId: null }),
}));
vi.mock("@/core/context/AuthContext", () => ({
  useAuth: () => ({ isAdmin: roles.isAdmin, isPlayerRole: roles.isPlayerRole }),
}));

function renderSections(props: Partial<React.ComponentProps<typeof NavSections>> = {}) {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <NavSections variant="full" {...props} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

describe("NavSections", () => {
  beforeEach(() => {
    Object.assign(roles, { isDM: false, isAdmin: false, isPlayerRole: true });
  });

  it("shows a player only the player destinations", () => {
    renderSections();
    expect(screen.getByRole("link", { name: /characters/i })).toBeInTheDocument();
    expect(screen.queryByText("DM Tools")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("adds DM tools and admin for an admin", () => {
    Object.assign(roles, { isAdmin: true });
    renderSections();
    expect(screen.getByText("DM Tools")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /email whitelist/i })).toBeInTheDocument();
  });

  // The More sheet passes the tab bar's destinations so nothing is shown twice.
  it("leaves out excluded destinations, and drops a group left empty", () => {
    Object.assign(roles, { isDM: true });
    renderSections({
      variant: "tile",
      exclude: ["/characters", "/campaigns", "/encounter", "/dm/members"],
    });
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).not.toContain("/characters");
    expect(hrefs).not.toContain("/dm/members");
    // Same label as the excluded player entry, different destination: kept.
    expect(hrefs).toContain("/dm/characters");
    // The player group had only excluded entries, so DM Tools now leads.
    expect(screen.getAllByRole("region")).toHaveLength(1);
  });
});
