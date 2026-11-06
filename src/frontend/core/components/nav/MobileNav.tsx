import { useLocation, useNavigate } from "react-router";
import { LayoutGrid, LogOut, Settings, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/core/components/ui/sheet";
import { Badge } from "@/core/components/ui/badge";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { cn } from "@/lib/utils";
import { NavItem } from "./NavItem";
import { navIndicator } from "./navStyles";
import { NavSections } from "./NavSections";
import { useNavGroups } from "./useNavGroups";
import { playerNav, dmNav } from "./navConfig";

/** Shown in the tab bar for a DM-only account, whose player nav is empty. */
const DM_PRIMARY = ["/dm/encounters", "/dm/characters", "/dm/campaigns"];

const matches = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

/**
 * The More panel's open state, kept in the browser history: opening it adds
 * an entry for the same page, so Android's back gesture (which wry maps to
 * history.back) closes the panel instead of leaving the page. Destinations
 * inside it navigate with `replace`, so that entry never lingers behind them.
 */
function useMorePanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as Record<string, unknown>;
  const here = { pathname: location.pathname, search: location.search, hash: location.hash };

  const open = state.more === true;
  const openMore = () => {
    void navigate(here, { state: { ...state, more: true } });
  };
  const closeMore = () => {
    // Opened by a reload or a shared link, there's no entry of ours to go
    // back past; drop the flag in place instead.
    if (location.key === "default") {
      void navigate(here, { replace: true, state: { ...state, more: false } });
    } else {
      void navigate(-1);
    }
  };
  return { open, openMore, closeMore };
}

/**
 * Phone navigation: a bottom tab bar, and a full-screen "More" panel.
 *
 * The bar sits within thumb reach, as Android's own apps put it, and runs
 * under the home gesture handle with its tabs just above it. It carries at
 * most three primary destinations plus More. Which three depends on role: a
 * player gets the player nav; a DM-only account would otherwise see an empty
 * bar, so it gets the three DM destinations used while running a session.
 *
 * More fills the screen with a grid of labelled, described tiles; the
 * destinations the bar already shows are left out of it. The campaign and
 * light bar are in PhoneAppBar, at the top.
 */
export function MobileNav({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { open, openMore, closeMore } = useMorePanel();
  const { pathname } = useLocation();
  const { isPlayerRole } = useAuth();
  const { activeEncounterId } = useCampaign();

  const primary = isPlayerRole
    ? playerNav
    : dmNav.filter((e) => DM_PRIMARY.includes(e.to));
  const primaryPaths = primary.map((e) => e.to);

  // When the current page lives behind More, More is the tab that is "on" --
  // otherwise the bar shows no selection at all and the user loses their place.
  const overflowActive = useNavGroups(primaryPaths).some((g) =>
    g.entries.some((e) => matches(pathname, e.to)),
  );
  const moreActive = open || overflowActive;

  return (
    <>
      {/* ── Bottom tab bar ───────────────────────────────────────────────── */}
      <nav
        aria-label="Sections"
        className="flex shrink-0 border-t border-border/40 bg-card pb-[max(var(--safe-bottom),0.25rem)] pl-[var(--safe-left)] pr-[var(--safe-right)] pt-1 md:hidden"
      >
        {primary.map((entry) => {
          const blocked = entry.requiresEncounter && !activeEncounterId;
          return (
            <NavItem
              key={entry.to}
              entry={entry}
              variant="tab"
              disabled={blocked}
              disabledTip="No active encounter"
              showLiveDot={entry.requiresEncounter && !!activeEncounterId}
            />
          );
        })}
        <button
          type="button"
          onClick={openMore}
          aria-label="More navigation"
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 text-[10.5px] leading-tight tracking-tight transition-colors",
            moreActive ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className={navIndicator(moreActive)}>
            <LayoutGrid className="h-5 w-5 shrink-0" />
          </span>
          More
        </button>
      </nav>

      {/* ── More panel ───────────────────────────────────────────────────── */}
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) closeMore();
        }}
      >
        <SheetContent
          side="bottom"
          hideClose
          overlay={false}
          className="top-0 gap-0 border-0 p-0 pl-[var(--safe-left)] pr-[var(--safe-right)] pt-[var(--safe-top)] shadow-none md:hidden"
        >
          <SheetTitle className="sr-only">More</SheetTitle>
          <SheetDescription className="sr-only">
            Other destinations and your account.
          </SheetDescription>

          <ProfileCard
            onOpenAccount={() => {
              closeMore();
              onOpenAccount();
            }}
          />

          <div
            data-scroll-container
            className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
          >
            <NavSections variant="tile" exclude={primaryPaths} replace />
          </div>

          <SignOutRow />
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Who is signed in, with the account and close controls beside it. */
function ProfileCard({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { user, isAdmin, isPlayerRole, displayName } = useAuth();
  const { isDM, campaign } = useCampaign();

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "?";

  const role = isAdmin
    ? { text: "Admin", variant: "destructive" as const }
    : isDM
      ? { text: "Dungeon Master", variant: "secondary" as const }
      : isPlayerRole
        ? { text: "Player", variant: "outline" as const }
        : null;

  const iconButton =
    "flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground active:bg-accent/30";

  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3">
      <div
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary/15 text-sm font-semibold text-primary"
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          {role && (
            <Badge variant={role.variant} className="shrink-0 text-[10px]">
              {role.text}
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {campaign?.name ?? user?.email}
        </p>
      </div>
      <button
        type="button"
        onClick={onOpenAccount}
        aria-label="Account settings"
        className={iconButton}
      >
        <Settings className="h-5 w-5" />
      </button>
      <SheetClose aria-label="Close" className={iconButton}>
        <X className="h-5 w-5" />
      </SheetClose>
    </div>
  );
}

function SignOutRow() {
  const { signOut } = useAuth();
  return (
    <div className="border-t border-border/40 px-3 pb-[max(0.75rem,var(--safe-bottom))] pt-2">
      <button
        type="button"
        onClick={() => {
          void signOut();
        }}
        className="flex h-12 w-full items-center gap-3 px-3 text-sm text-muted-foreground transition-colors hover:text-destructive active:bg-destructive/10"
      >
        <LogOut className="h-5 w-5" />
        Sign out
      </button>
    </div>
  );
}
