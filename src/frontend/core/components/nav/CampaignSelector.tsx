import { ChevronDown, Swords } from "lucide-react";
import { useCampaign } from "@/core/context/CampaignContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { CampaignIcon } from "@/core/components/CampaignIcon";
import { useBreakpoint } from "@/core/hooks/useBreakpoint";
import type { Campaign } from "@/features/campaign/types/campaign.types";
import { cn } from "@/lib/utils";

/**
 * The selected campaign, as the app's identity: the icon its DM chose, its
 * name and session, and a switcher when there is more than one. Shared by the
 * desktop sidebar header and the phone header. With no campaign yet it shows
 * the City of Stars star and name.
 */
export function CampaignSelector() {
  const { campaign, campaigns } = useCampaign();
  const { isPhone } = useBreakpoint();
  const switchable = campaigns.length > 1;
  const identity = <CampaignIdentity campaign={campaign} switchable={switchable} />;

  if (!switchable) return <div className="flex min-w-0 items-center gap-2.5">{identity}</div>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Switch campaign (current: ${campaign?.name ?? "none"})`}
          className="group flex min-w-0 items-center gap-2.5 text-left"
        >
          {identity}
        </button>
      </PopoverTrigger>
      {/* side="right" pushes a 208px panel off-screen on a narrow viewport,
          where the nav is an overlay rather than a fixed rail. */}
      <CampaignList side={isPhone ? "bottom" : "right"} />
    </Popover>
  );
}

function CampaignIdentity({ campaign, switchable }: { campaign: Campaign | null; switchable: boolean }) {
  return (
    <>
      <CampaignIcon icon={campaign?.icon} />
      <span className="min-w-0">
        <span className="flex items-center gap-1">
          {campaign ? (
            <span className="truncate text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
              {campaign.name}
            </span>
          ) : (
            <Brand />
          )}
          {switchable && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </span>
        {campaign && (
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
            {campaign.session_label} {campaign.current_session}
          </span>
        )}
      </span>
    </>
  );
}

/**
 * The rail's version: no room for the name beside the icon, so the icon is
 * the button and the campaign's initials sit under it -- enough to tell two
 * campaigns apart at a glance. `compact` drops the initials, for a phone held
 * sideways where every row of height counts.
 */
export function RailCampaignSelector({ compact = false }: { compact?: boolean }) {
  const { campaign, campaigns } = useCampaign();
  const multiple = campaigns.length > 1;

  const face = (
    <>
      <CampaignIcon icon={campaign?.icon} size={compact ? "sm" : "lg"} />
      {!compact && (
        <span className="flex max-w-full items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="truncate">{initials(campaign?.name)}</span>
          {multiple && <ChevronDown className="h-3 w-3 shrink-0" />}
        </span>
      )}
    </>
  );
  const shape = cn("flex w-full flex-col items-center gap-1 px-1", compact ? "py-1.5" : "py-2");

  if (!multiple) {
    return (
      <div className={shape} title={campaign?.name}>
        {face}
      </div>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Switch campaign (current: ${campaign?.name ?? "none"})`}
          className={cn(shape, "transition-colors hover:bg-accent/30")}
        >
          {face}
        </button>
      </PopoverTrigger>
      <CampaignList side="right" />
    </Popover>
  );
}

function Brand() {
  return (
    <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-sm font-bold leading-tight tracking-tight text-transparent">
      City of Stars
    </span>
  );
}

function CampaignList({ side }: { side: "bottom" | "right" }) {
  const { campaign, campaigns, campaignEncounters, switchCampaign } = useCampaign();
  return (
    <PopoverContent side={side} align="start" className="w-60 p-1">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Switch Campaign
      </p>
      {campaigns.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => {
            void switchCampaign(c.id);
          }}
          className={cn(
            "flex min-h-10 w-full items-center gap-2 px-2 py-1.5 text-left text-sm transition-colors",
            c.id === campaign?.id
              ? "bg-primary/15 font-medium text-primary"
              : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground",
          )}
        >
          <CampaignIcon icon={c.icon} size="sm" />
          <span className="flex-1 truncate">{c.name}</span>
          {campaignEncounters[c.id] && (
            <Swords className="h-3 w-3 shrink-0 text-success" aria-label="Encounter running" />
          )}
        </button>
      ))}
    </PopoverContent>
  );
}

/** "The Shattered Vault" -> "TSV"; at most three letters. */
function initials(name: string | undefined): string {
  if (!name) return "";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join("");
}
