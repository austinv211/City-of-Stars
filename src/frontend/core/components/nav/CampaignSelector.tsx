import { ChevronDown, Swords } from "lucide-react";
import { useCampaign } from "@/core/context/CampaignContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { AnimatedStar } from "@/core/components/TitleBar";
import { useBreakpoint } from "@/core/hooks/useBreakpoint";
import { cn } from "@/lib/utils";

/**
 * Brand + active campaign, with a switcher when there is more than one.
 * Shared by the desktop sidebar header and the phone header.
 */
export function CampaignSelector() {
  const { campaign, campaigns } = useCampaign();
  const { isPhone } = useBreakpoint();

  if (campaigns.length <= 1) {
    return (
      <div className="min-w-0">
        <Brand />
        {campaign && (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            {campaign.name}
          </p>
        )}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="group min-w-0 text-left">
          <Brand />
          <div className="mt-0.5 flex items-center gap-1">
            <p className="truncate text-[11px] leading-tight text-muted-foreground transition-colors group-hover:text-foreground">
              {campaign?.name ?? "Select campaign"}
            </p>
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>
      {/* side="right" pushes a 208px panel off-screen on a narrow viewport,
          where the nav is an overlay rather than a fixed rail. */}
      <CampaignList side={isPhone ? "bottom" : "right"} />
    </Popover>
  );
}

/**
 * The tablet rail's version: no room for the name beside the logo, so the
 * logo is the button and the campaign's initials sit under it -- enough to
 * tell two campaigns apart at a glance. Before this the rail had no campaign
 * switcher at all; a tablet user could not change campaign.
 */
export function RailCampaignSelector() {
  const { campaign, campaigns } = useCampaign();
  const multiple = campaigns.length > 1;

  const face = (
    <>
      <span className="flex h-9 w-9 items-center justify-center bg-primary/15">
        <AnimatedStar size={20} />
      </span>
      <span className="flex max-w-full items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="truncate">{initials(campaign?.name)}</span>
        {multiple && <ChevronDown className="h-3 w-3 shrink-0" />}
      </span>
    </>
  );
  const shape = "flex w-full flex-col items-center gap-1 px-1 py-2";

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
    <p className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-sm font-bold leading-tight tracking-tight text-transparent">
      City of Stars
    </p>
  );
}

function CampaignList({ side }: { side: "bottom" | "right" }) {
  const { campaign, campaigns, campaignEncounters, switchCampaign } = useCampaign();
  return (
    <PopoverContent side={side} align="start" className="w-56 p-1">
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
          <span className="flex-1 truncate">{c.name}</span>
          {campaignEncounters[c.id] && (
            <Swords
              className="h-3 w-3 shrink-0 text-success"
              aria-label="Encounter running"
            />
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
