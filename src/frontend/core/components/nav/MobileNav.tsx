import { useState } from "react";
import { LogOut, Menu, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/core/components/ui/sheet";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { cn } from "@/lib/utils";
import { NavItem } from "./NavItem";
import { NavSections } from "./NavSections";
import { playerNav, dmNav } from "./navConfig";

/**
 * Phone navigation: a fixed bottom tab bar plus an overflow sheet.
 *
 * A 224px sidebar leaves 136px of content on a 360px screen, so below `md` the
 * nav moves to the bottom edge — within thumb reach — and everything secondary
 * goes behind "More".
 *
 * The bar carries at most three primary destinations plus More. Which three
 * depends on role: a player gets the player nav; a DM-only account would
 * otherwise see an empty bar, so it gets the three DM destinations that
 * actually get used while running a session.
 */
export function MobileNav({ onOpenAccount }: { onOpenAccount: () => void }) {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, isPlayerRole, signOut, displayName } = useAuth();
  const { activeEncounterId, isDM } = useCampaign();

  const primary = isPlayerRole
    ? playerNav
    : dmNav.filter((e) =>
        ["/dm/encounters", "/dm/characters", "/dm/campaigns"].includes(e.to),
      );

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
          aria-expanded={open}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] transition-colors",
            open
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Menu className="h-5 w-5 shrink-0" />
          More
        </button>
      </div>

      {/* ── Overflow sheet ───────────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-xs gap-0 p-0">
          <SheetHeader className="pr-12">
            <SheetTitle>City of Stars</SheetTitle>
            <p className="truncate text-xs text-muted-foreground">{displayName}</p>
          </SheetHeader>

          <div
            data-scroll-container
            className="flex-1 overflow-y-auto p-2"
          >
            <NavSections
              variant="full"
              onNavigate={() => {
                setOpen(false);
              }}
            />
          </div>

          <Separator />

          <div className="space-y-1 p-3">
            <div className="px-2 py-1">
              <p className="truncate text-xs font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-[10px] leading-tight text-muted-foreground">
                {user?.email}
              </p>
              {isDM && (
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  Dungeon Master
                </Badge>
              )}
              {isPlayerRole && !isDM && !isAdmin && (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  Player
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOpen(false);
                onOpenAccount();
              }}
            >
              <Settings className="h-4 w-4" />
              Account settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                void signOut();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
