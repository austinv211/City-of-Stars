import { BookOpen, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/core/context/AuthContext";
import { useRulesLookup } from "@/features/rules/context/RulesLookupContext";
import { Separator } from "@/core/components/ui/separator";
import { cn } from "@/lib/utils";
import { CampaignSelector, RailCampaignSelector } from "./CampaignSelector";
import { NavSections } from "./NavSections";
import { RAIL_ITEM, navIndicator } from "./navStyles";

/**
 * The 768-1279px navigation: a labelled rail, 88px wide.
 *
 * Every destination is an icon in an indicator chip over a short label, at
 * least 56px tall -- the touch-tablet pattern -- rather than a bare 16px icon
 * whose name only appeared in a hover tooltip a touch screen cannot show.
 * Campaign switching, which the rail previously lacked, lives in the logo.
 *
 * On a short screen -- a phone held sideways, 400-odd pixels tall -- the rail
 * widens into compact rows of icon and label (RAIL_ITEM), and the campaign
 * becomes one row of icon and name, so more of it fits without scrolling.
 */
export function TabletRail({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { signOut } = useAuth();
  const { openRules } = useRulesLookup();
  return (
    <aside
      aria-label="Navigation rail"
      className="hidden w-[5.5rem] shrink-0 flex-col border-r border-border/40 bg-card pb-[var(--safe-bottom)] pl-[var(--safe-left)] md:flex xl:hidden short:w-48"
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
      <div className="flex flex-col gap-0.5 px-1 py-1.5">
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

/** A rail item that acts rather than navigates; same shape as the links. */
function RailButton({
  label,
  name,
  icon: Icon,
  onClick,
  highlight = false,
}: {
  label: string;
  /** The accessible name, when the short label isn't the whole of it. */
  name?: string;
  /** Draw it in the primary colour, for an action people should spot. */
  highlight?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      className={cn(
        RAIL_ITEM,
        "transition-colors",
        highlight ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className={cn(navIndicator(false), highlight && "bg-primary/15")}>
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}
