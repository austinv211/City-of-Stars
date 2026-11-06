import { NavLink } from "react-router";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/core/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { navIndicator } from "./navStyles";
import type { NavEntry } from "./navConfig";

export type NavVariant = "full" | "rail" | "tab" | "tile";

/**
 * Per-variant geometry, in one place so the three renderers below cannot drift.
 *
 *   full  desktop sidebar — icon + label, left accent bar when active
 *   rail  tablet rail     — icon in an indicator chip over a short label;
 *         88px wide, every target at least 56px tall. It used to be a bare
 *         16px icon with the label in a hover tooltip, which on a tablet --
 *         a touch device, with no hover -- meant no label at all.
 *   tab   phone tab bar   — icon over label; when active the icon sits in a
 *         filled indicator, as in Android's own navigation bars (navStyles)
 *   tile  phone More sheet — a card: icon chip, label, one-line description.
 *         Rendered by TileItem below rather than through these tables, since
 *         its anatomy differs rather than just its spacing.
 */
const LAYOUT: Record<Exclude<NavVariant, "tile">, string> = {
  full: "gap-3 px-3 py-2 text-sm",
  rail: "group min-h-14 w-full flex-col justify-center gap-1 px-1 py-1.5 text-center text-[10.5px] leading-tight",
  tab: "group min-w-0 flex-1 flex-col justify-center gap-1 py-1 text-[10.5px] leading-tight tracking-tight",
};

const ACTIVE: Record<Exclude<NavVariant, "tile">, string> = {
  full: "border-l-2 border-primary bg-primary/10",
  // The indicator carries the active state (navIndicator), not the whole row.
  rail: "",
  // The indicator around the icon carries it (navIndicator), as on the rail.
  tab: "",
};

const iconSize = (v: NavVariant) => (v === "full" ? "h-4 w-4" : "h-5 w-5");

/** The label each layout has room for. */
const textFor = (v: NavVariant, e: NavEntry) =>
  v === "tab"
    ? (e.shortLabel ?? e.label)
    : v === "rail"
      ? (e.railLabel ?? e.label)
      : e.label;

interface Props {
  entry: NavEntry;
  variant: NavVariant;
  /** Live-encounter dot. Passed in so this stays presentational. */
  showLiveDot?: boolean;
  disabled?: boolean;
  disabledTip?: string;
  onNavigate?: () => void;
  /** Replace the current history entry instead of adding one. */
  replace?: boolean;
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
  const { icon: Icon } = entry;
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
          {variant === "rail" || variant === "tab" ? (
            <span className={navIndicator(false)}>
              <Icon className={iconSize(variant)} />
            </span>
          ) : (
            <Icon className={cn("shrink-0", iconSize(variant))} />
          )}
          <span className={variant === "rail" ? "line-clamp-2" : undefined}>
            {textFor(variant, entry)}
          </span>
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
  replace,
}: Props & { variant: Exclude<NavVariant, "tile"> }) {
  const { to, icon: Icon } = entry;
  const rail = variant === "rail";

  const icon = (
    <>
      <Icon className={iconSize(variant)} />
      {showLiveDot && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute rounded-full bg-success",
            variant === "full"
              ? "-right-1 -top-1 h-1.5 w-1.5"
              : "right-3 top-1 h-2 w-2 ring-2 ring-card",
          )}
        />
      )}
    </>
  );

  return (
    <NavLink
      to={to}
      replace={replace}
      onClick={onNavigate}
      // The rail's short label ("Sessions") is what shows; the full one is
      // the accessible name, as it is everywhere else.
      aria-label={rail ? entry.label : undefined}
      className={({ isActive }) =>
        cn(
          "relative flex items-center transition-all duration-150",
          LAYOUT[variant],
          isActive
            ? cn("font-medium text-primary", ACTIVE[variant])
            : cn(
                "text-muted-foreground hover:text-foreground",
                // The rail highlights its chip on hover, not the whole row.
                !rail && "hover:bg-accent/30",
              ),
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={rail || variant === "tab" ? navIndicator(isActive) : "relative shrink-0"}
          >
            {icon}
          </span>
          <span className={rail ? "line-clamp-2 w-full break-words" : "truncate"}>
            {textFor(variant, entry)}
          </span>
        </>
      )}
    </NavLink>
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
function TileItem({ entry, showLiveDot, disabled, disabledTip, onNavigate, replace }: Props) {
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
      replace={replace}
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
