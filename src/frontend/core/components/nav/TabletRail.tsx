import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/core/context/AuthContext";
import { Separator } from "@/core/components/ui/separator";
import { cn } from "@/lib/utils";
import { RailCampaignSelector } from "./CampaignSelector";
import { NavSections } from "./NavSections";

/**
 * The 768-1279px navigation: a labelled rail, 88px wide.
 *
 * Every destination is an icon in an indicator chip over a short label, at
 * least 56px tall -- the touch-tablet pattern -- rather than a bare 16px icon
 * whose name only appeared in a hover tooltip a touch screen cannot show.
 * Campaign switching, which the rail previously lacked, lives in the logo.
 */
export function TabletRail({ onOpenAccount }: { onOpenAccount: () => void }) {
  const { signOut } = useAuth();
  return (
    <aside
      aria-label="Navigation rail"
      className="hidden w-[5.5rem] shrink-0 flex-col border-r border-border/40 bg-card pl-[var(--safe-left)] md:flex xl:hidden"
    >
      <div className="shrink-0 border-b border-border/40">
        <RailCampaignSelector />
      </div>
      <div data-scroll-container className="flex-1 overflow-y-auto px-1 py-2">
        <NavSections variant="rail" />
      </div>
      <Separator />
      <div className="flex flex-col gap-0.5 px-1 py-1.5">
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
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 py-1.5",
        "text-[11px] leading-tight text-muted-foreground transition-colors hover:text-foreground",
      )}
    >
      <span className="flex h-8 w-14 items-center justify-center transition-colors group-hover:bg-accent/30">
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}
