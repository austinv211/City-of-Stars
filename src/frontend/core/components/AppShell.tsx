import { useState } from "react";
import { Outlet } from "react-router";
import { LogOut, Settings } from "lucide-react";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { DiceProvider } from "@/features/encounter/context/DiceContext";
import { TooltipProvider } from "@/core/components/ui/tooltip";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { AnimatedStar, TitleBar } from "@/core/components/TitleBar";
import { NavSections } from "@/core/components/nav/NavSections";
import { MobileNav } from "@/core/components/nav/MobileNav";
import { CampaignSelector } from "@/core/components/nav/CampaignSelector";
import { TabletRail } from "@/core/components/nav/TabletRail";
import { useMotionAttribute } from "@/core/hooks/useFeelPrefs";
import DiceRollOverlay from "./DiceRollOverlay";
import { AccountDialog } from "./AccountDialog";

/** Identity + account controls, for the desktop sidebar footer. */
function SidebarFooter({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { user, isAdmin, isPlayerRole, signOut, displayName } = useAuth();
  const { isDM } = useCampaign();

  return (
    <div className="space-y-1 p-3">
      <div className="flex items-start gap-1 px-2 py-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
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
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onOpenAccount}
          aria-label="Account settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
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
  );
}

/**
 * Application shell.
 *
 * Three layouts, selected by CSS rather than by a JS breakpoint hook. That
 * matters: switching on `useBreakpoint()` would unmount and remount the whole
 * nav tree on every resize across a boundary, and would flash the wrong layout
 * for a frame on first paint. Media queries do it for free.
 *
 *   < 768px     phone  — brand header on top, bottom tab bar below
 *   768-1279px  tablet — 64px icon rail with tooltips
 *   >= 1280px   desktop — 224px labelled sidebar (the original layout)
 *
 * `h-dvh` rather than `h-screen`: `vh` on mobile browsers includes the area
 * behind the retracting URL bar, which would push the bottom tab bar off-screen.
 */
export default function AppShell() {
  const [accountOpen, setAccountOpen] = useState(false);
  useMotionAttribute();

  const openAccount = () => {
    setAccountOpen(true);
  };

  return (
    <DiceProvider>
      <TooltipProvider>
        <div className="flex h-dvh flex-col overflow-hidden bg-background">
          {/* Desktop Tauri window chrome; renders nothing on a mobile shell. */}
          <TitleBar />

          {/* Phone header — the sidebar's brand block, relocated. */}
          <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-border/40 bg-card px-3 pt-[var(--safe-top)] md:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary/15">
              <AnimatedStar size={20} />
            </div>
            <CampaignSelector />
          </header>

          <div className="flex flex-1 overflow-hidden">
            {/* ── Tablet: labelled rail ─────────────────────────────────── */}
            <TabletRail onOpenAccount={openAccount} />

            {/* ── Desktop: full sidebar ──────────────────────────────────── */}
            <aside className="hidden w-56 shrink-0 flex-col border-r border-border/40 bg-card pl-[var(--safe-left)] xl:flex">
              <div className="flex h-12 items-center gap-2.5 border-b border-border/40 px-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary/15">
                  <AnimatedStar size={20} />
                </div>
                <CampaignSelector />
              </div>
              <div data-scroll-container className="flex-1 overflow-y-auto p-2 pt-3">
                <NavSections variant="full" />
              </div>
              <Separator />
              <SidebarFooter onOpenAccount={openAccount} />
            </aside>

            {/* ── Content ────────────────────────────────────────────────── */}
            <main
              data-scroll-container
              className="flex min-w-0 flex-1 flex-col overflow-auto"
            >
              <Outlet />
            </main>
          </div>

          {/* Phone bottom tab bar + overflow sheet. */}
          <MobileNav onOpenAccount={openAccount} />
        </div>

        <DiceRollOverlay />
        <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      </TooltipProvider>
    </DiceProvider>
  );
}
