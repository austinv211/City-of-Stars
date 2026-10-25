import { useState } from "react";
import { useLocation } from "react-router";
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
import { NavSections } from "./NavSections";
import { useNavGroups } from "./useNavGroups";
import { playerNav, dmNav } from "./navConfig";

/** Shown in the tab bar for a DM-only account, whose player nav is empty. */
const DM_PRIMARY = ["/dm/encounters", "/dm/characters", "/dm/campaigns"];

const matches = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`);

/**
 * Phone navigation: a fixed bottom tab bar plus a "More" bottom sheet.
 *
 * A 224px sidebar leaves 136px of content on a 360px screen, so below `md` the
 * nav moves to the bottom edge — within thumb reach — and everything secondary
 * goes behind "More".
 *
 * The bar carries at most three primary destinations plus More. Which three
 * depends on role: a player gets the player nav; a DM-only account would
 * otherwise see an empty bar, so it gets the three DM destinations that
 * actually get used while running a session.
 *
 * More opens from the bottom, where the thumb already is, as a grid of
 * labelled, described tiles rather than a desktop sidebar squeezed into a
 * drawer. Destinations the tab bar already shows are left out of it.
 */
export function MobileNav({ onOpenAccount }: { onOpenAccount: () => void }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { isPlayerRole } = useAuth();
  const { activeEncounterId } = useCampaign();

  const primary = isPlayerRole
    ? playerNav
    : dmNav.filter((e) => DM_PRIMARY.includes(e.to));
  const primaryPaths = primary.map((e) => e.to);

  // When the current page lives behind More, More is the tab that is "on" —
  // otherwise the bar shows no selection at all and the user loses their place.
  const overflowActive = useNavGroups(primaryPaths).some((g) =>
    g.entries.some((e) => matches(pathname, e.to)),
  );
  const moreActive = open || overflowActive;

  return (
    <>
      {/* ── Bottom tab bar ───────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 border-t border-border/40 bg-card pb-[var(--safe-bottom)] md:hidden"
        style={{ boxShadow: "var(--shadow-md)" }}
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
          onClick={() => {
            setOpen(true);
          }}
          aria-label="More navigation"
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] transition-colors",
            moreActive
              ? "bg-primary/10 font-medium text-primary before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-5 w-5 shrink-0" />
          More
        </button>
      </div>

      {/* ── More sheet ───────────────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          hideClose
          className="max-h-[85dvh] gap-0 p-0 md:hidden"
        >
          {/* Grab handle — the bottom-sheet affordance, as in ResponsiveDialog. */}
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30"
          />
          <SheetTitle className="sr-only">More</SheetTitle>
          <SheetDescription className="sr-only">
            Other destinations and your account.
          </SheetDescription>

          <ProfileCard
            onOpenAccount={() => {
              setOpen(false);
              onOpenAccount();
            }}
          />

          <div
            data-scroll-container
            className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
          >
            <NavSections
              variant="tile"
              exclude={primaryPaths}
              onNavigate={() => {
                setOpen(false);
              }}
            />
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
    <div className="flex items-center gap-3 border-b border-border/40 px-4 pb-3 pt-2">
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
