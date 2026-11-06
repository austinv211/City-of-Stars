import { AnimatedStar } from "@/core/components/TitleBar";
import { findCampaignIcon } from "@/core/lib/campaignIcons";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { chip: "h-7 w-7", icon: "h-4 w-4", star: 16 },
  md: { chip: "h-8 w-8", icon: "h-[18px] w-[18px]", star: 20 },
  lg: { chip: "h-9 w-9", icon: "h-5 w-5", star: 20 },
} as const;

/**
 * A campaign's icon in its chip: the one its DM chose, or the City of Stars
 * star when there is none (or no campaign at all).
 */
export function CampaignIcon({
  icon,
  size = "md",
  className,
}: {
  icon?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const chosen = findCampaignIcon(icon);
  const s = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center justify-center bg-primary/15 text-secondary", s.chip, className)}
    >
      {chosen ? <chosen.Icon className={s.icon} /> : <AnimatedStar size={s.star} />}
    </span>
  );
}
