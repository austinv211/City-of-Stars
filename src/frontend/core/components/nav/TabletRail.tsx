import { BookOpen, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/core/context/AuthContext";
import { useRulesLookup } from "@/features/rules/context/RulesLookupContext";
import { Separator } from "@/core/components/ui/separator";
import { cn } from "@/lib/utils";
import { CampaignSelector, RailCampaignSelector } from "./CampaignSelector";
import { NavSections } from "./NavSections";
import { navIndicator } from "./navStyles";

/**
 * The 768-1023px navigation: a labelled rail, 88px wide. From 1024px the app
 * shell shows the full sidebar instead.
 *
 * Every destination is an icon in an indicator chip over a short label, at
 * least 56px tall -- the touch-tablet pattern -- rather than a bare 16px icon
 * whose name only appeared in a hover tooltip a touch screen cannot show. The
 * campaign's icon sits at the top and switches campaign.
 *
 * On a short screen -- a phone held sideways, 400-odd pixels tall -- the rail
 * widens into compact rows of icon and label, the campaign becomes one row of
 * icon and name, and Rules, Account and Sign out share one row of icons, so
 * the destinations fit without scrolling.
 *
 * The rail starts below the status bar and above the gesture bar: on Android
 * the app draws under both.
 */
export function TabletRail({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { signOut } = useAuth();
  const { openRules } = useRulesLookup();
  return (
    <aside
      aria-label="Navigation rail"
      className="hidden w-[5.5rem] shrink-0 flex-col border-r border-border/40 bg-card pb-[var(--safe-bottom)] pl-[var(--safe-left)] pt-[var(--safe-top)] md:flex lg:hidden short:w-48"
    >
      <div className="shrink-0 border-b border-border/40">
        <div className="short:hidden">
          <RailCampaignSelector />
        </div>
        <div className="hidden h-12 items-center px-2 short:flex">
          <CampaignSelector />
        </div>
      </div>
      <div data-scroll-container className="flex-1 overflow-y-auto px-1 py-2">
        <NavSections variant="rail" />
      </div>
      <Separator />
      <div className="flex flex-col gap-0.5 px-1 py-1.5 short:flex-row short:py-1">
        <RailButton label="Rules" name="Rules Reference" icon={BookOpen} onClick={openRules} highlight />
        <RailButton label="Account" icon={Settings} onClick={onOpenAccount} />
        <RailButton
          label="Sign out"
          icon={LogOut}
          onClick={() => {
            void signOut();
          }}
        />
      </div>
    </aside>
  );
}

/**
 * A rail item that acts rather than navigates: icon over label, like the
 * links above it. On a short screen it's just the icon, three to a row.
 */
function RailButton({
  label,
  name = label,
  icon: Icon,
  onClick,
  highlight = false,
}: {
  label: string;
  /** The accessible name, when the short label isn't the whole of it. */
  name?: string;
  /**
   * Colour it, for an action people should spot. Colour only: a filled
   * indicator is how the rail marks the current page, and Rules isn't a page.
   */
  highlight?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      title={name}
      className={cn(
        "group flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10.5px] leading-tight transition-colors",
        "short:min-h-11 short:flex-1 short:py-0",
        highlight ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className={navIndicator(false)}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="short:sr-only">{label}</span>
    </button>
  );
}
