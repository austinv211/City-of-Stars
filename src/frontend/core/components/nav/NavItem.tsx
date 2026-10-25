import { NavLink } from "react-router";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NavEntry } from "./navConfig";

export type NavVariant = "full" | "icon" | "tab" | "tile";

/**
 * Per-variant geometry, in one place so the three renderers below cannot drift.
 *
 *   full  desktop sidebar — icon + label, left accent bar when active
 *   icon  tablet rail     — icon only, label in a tooltip
 *   tab   phone tab bar   — stacked icon over label, top accent bar when active
 *   tile  phone More sheet — a card: icon chip, label, one-line description.
 *         Rendered by TileItem below rather than through these tables, since
 *         its anatomy differs rather than just its spacing.
 */
const LAYOUT: Record<Exclude<NavVariant, "tile">, string> = {
  full: "gap-3 px-3 py-2 text-sm",
  icon: "h-10 w-full justify-center",
  tab: "flex-1 flex-col justify-center gap-1 py-1.5 text-[11px]",
};

const ACTIVE: Record<Exclude<NavVariant, "tile">, string> = {
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
  const { variant } = props;
  if (variant === "tile") return <TileItem {...props} />;
  return props.disabled ? (
    <DisabledItem {...props} variant={variant} />
  ) : (
    <ActiveItem {...props} variant={variant} />
  );
}

function DisabledItem({
  entry,
  variant,
  disabledTip,
}: Props & { variant: Exclude<NavVariant, "tile"> }) {
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

function ActiveItem({
  entry,
  variant,
  showLiveDot,
  onNavigate,
}: Props & { variant: Exclude<NavVariant, "tile"> }) {
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

/**
 * The phone More sheet's shape: a card sized for a thumb, not a cursor.
 *
 * The sidebar row it replaces was a 16px icon and a bare label, which is a
 * desktop affordance; on a phone the target was small and "Members" or
 * "Encounters" alone does not say which of several similarly named screens it
 * is. A tile gives the icon a 40px chip and adds the entry's description.
 *
 * No tooltip in the disabled state: there is no hover on touch, so the reason
 * replaces the description inline instead.
 */
function TileItem({ entry, showLiveDot, disabled, disabledTip, onNavigate }: Props) {
  const { to, label, description, icon: Icon } = entry;

  const body = (active: boolean) => (
    <>
      <span
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center transition-colors",
          active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="h-5 w-5" />
        {showLiveDot && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-card"
          />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
          {disabled ? disabledTip : description}
        </span>
      </span>
    </>
  );

  const shape = "flex min-h-[6.5rem] flex-col items-start gap-2.5 border p-3 text-left";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          shape,
          "cursor-not-allowed select-none border-border/40 opacity-50",
        )}
      >
        {body(false)}
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          shape,
          "transition-colors active:bg-primary/15",
          isActive
            ? "border-primary/60 bg-primary/10"
            : "border-border/50 bg-background/40 hover:border-primary/40",
        )
      }
    >
      {({ isActive }) => body(isActive)}
    </NavLink>
  );
}
