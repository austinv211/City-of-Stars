import { NavLink } from "react-router";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/core/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NavEntry } from "./navConfig";

export type NavVariant = "full" | "icon" | "tab";

/**
 * Per-variant geometry, in one place so the three renderers below cannot drift.
 *
 *   full  desktop sidebar — icon + label, left accent bar when active
 *   icon  tablet rail     — icon only, label in a tooltip
 *   tab   phone tab bar   — stacked icon over label, top accent bar when active
 */
const LAYOUT: Record<NavVariant, string> = {
  full: "gap-3 px-3 py-2 text-sm",
  icon: "h-10 w-full justify-center",
  tab: "flex-1 flex-col justify-center gap-1 py-1.5 text-[11px]",
};

const ACTIVE: Record<NavVariant, string> = {
  full: "border-l-2 border-primary bg-primary/10",
  icon: "bg-primary/10",
  // Top bar rather than left: the tab bar sits at the bottom of the screen,
  // so the accent reads better against the content above it.
  tab: "bg-primary/10 before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-primary",
};

const iconSize = (v: NavVariant) => (v === "tab" ? "h-5 w-5" : "h-4 w-4");

interface Props {
  entry: NavEntry;
  variant: NavVariant;
  /** Live-encounter dot. Passed in so this stays presentational. */
  showLiveDot?: boolean;
  disabled?: boolean;
  disabledTip?: string;
  onNavigate?: () => void;
}

/**
 * One navigation destination, in whichever shape the current layout needs.
 *
 * `aria-current="page"` comes from NavLink automatically, which is what lets
 * the E2E selectors stay role-based rather than class-based.
 */
export function NavItem(props: Props) {
  return props.disabled ? <DisabledItem {...props} /> : <ActiveItem {...props} />;
}

function DisabledItem({ entry, variant, disabledTip }: Props) {
  const { label, shortLabel, icon: Icon } = entry;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-disabled="true"
          className={cn(
            "flex cursor-not-allowed select-none items-center text-muted-foreground opacity-40",
            LAYOUT[variant],
          )}
        >
          <Icon className={cn("shrink-0", iconSize(variant))} />
          {variant !== "icon" && (variant === "tab" ? (shortLabel ?? label) : label)}
        </span>
      </TooltipTrigger>
      <TooltipContent side={variant === "tab" ? "top" : "right"}>
        {disabledTip}
      </TooltipContent>
    </Tooltip>
  );
}

function ActiveItem({ entry, variant, showLiveDot, onNavigate }: Props) {
  const { to, label, shortLabel, icon: Icon } = entry;
  const text = variant === "tab" ? (shortLabel ?? label) : label;

  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      aria-label={variant === "icon" ? label : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex items-center transition-all duration-150",
          LAYOUT[variant],
          isActive
            ? cn("font-medium text-primary", ACTIVE[variant])
            : "text-muted-foreground hover:bg-accent/30 hover:text-foreground",
        )
      }
    >
      <span className="relative shrink-0">
        <Icon className={iconSize(variant)} />
        {showLiveDot && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute h-1.5 w-1.5 rounded-full bg-success",
              variant === "full" ? "-right-1 -top-1" : "-right-1.5 -top-0.5",
            )}
          />
        )}
      </span>
      {variant !== "icon" && <span className="truncate">{text}</span>}
    </NavLink>
  );

  // Icon-only rail: the label has to be reachable somehow.
  if (variant !== "icon") return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
