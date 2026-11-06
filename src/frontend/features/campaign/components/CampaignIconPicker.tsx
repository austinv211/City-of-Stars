import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { CampaignIcon } from "@/core/components/CampaignIcon";
import { AnimatedStar } from "@/core/components/TitleBar";
import { CAMPAIGN_ICONS } from "@/core/lib/campaignIcons";
import { cn } from "@/lib/utils";

const option = (selected: boolean) =>
  cn(
    "flex h-11 w-11 items-center justify-center transition-colors",
    selected
      ? "bg-primary/20 text-primary ring-1 ring-primary"
      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
  );

/**
 * The DM's choice of campaign icon: the current icon is the button, and it
 * opens a grid of the icons in core/lib/campaignIcons plus the default star.
 */
export function CampaignIconPicker({
  icon,
  onChange,
}: {
  icon: string | null | undefined;
  onChange: (icon: string | null) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const choose = (next: string | null) => {
    setOpen(false);
    if (next !== (icon ?? null)) void onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change campaign icon"
          className="transition-opacity hover:opacity-80"
        >
          <CampaignIcon icon={icon} size="lg" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Campaign icon
        </p>
        <div role="group" aria-label="Campaign icon" className="grid grid-cols-5 gap-1">
          <button
            type="button"
            aria-label="Star (default)"
            aria-pressed={!icon}
            className={option(!icon)}
            onClick={() => {
              choose(null);
            }}
          >
            <AnimatedStar size={18} />
          </button>
          {CAMPAIGN_ICONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={icon === id}
              className={option(icon === id)}
              onClick={() => {
                choose(id);
              }}
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
