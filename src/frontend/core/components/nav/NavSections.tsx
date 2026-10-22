import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { cn } from "@/lib/utils";
import { NavItem, type NavVariant } from "./NavItem";
import { playerNav, dmNav, adminNav } from "./navConfig";

interface Props {
  variant: NavVariant;
  /** Called after any navigation — lets a containing sheet close itself. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * The full navigation tree, role-filtered, at the requested density.
 *
 * Shared by the desktop sidebar and the phone overflow sheet (variant "full")
 * and by the tablet rail (variant "icon"), so the role gating and the
 * live-encounter dot are implemented once.
 */
export function NavSections({ variant, onNavigate, className }: Props) {
  const { activeEncounterId, isDM } = useCampaign();
  const { isAdmin, isPlayerRole } = useAuth();
  const iconOnly = variant === "icon";

  const heading = (text: string, tone: string) =>
    iconOnly ? (
      // A rail has no room for text headings; a divider carries the grouping.
      <div className="my-1.5 px-2" role="separator">
        <div className="h-px bg-border/60" />
      </div>
    ) : (
      <div className="px-3 pb-1 pt-4">
        <p className={cn("text-xs font-semibold uppercase tracking-wider", tone)}>
          {text}
        </p>
      </div>
    );

  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex flex-col",
        iconOnly ? "items-center gap-1" : "gap-0.5",
        className,
      )}
    >
      {isPlayerRole &&
        playerNav.map((entry) => {
          const blocked = entry.requiresEncounter && !activeEncounterId;
          return (
            <NavItem
              key={entry.to}
              entry={entry}
              variant={variant}
              disabled={blocked}
              disabledTip="No active encounter"
              showLiveDot={entry.requiresEncounter && !!activeEncounterId}
              onNavigate={onNavigate}
            />
          );
        })}

      {(isDM || isAdmin) && (
        <>
          {heading("DM Tools", "text-primary")}
          {dmNav.map((entry) => (
            <NavItem
              key={entry.to}
              entry={entry}
              variant={variant}
              onNavigate={onNavigate}
            />
          ))}
        </>
      )}

      {isAdmin && (
        <>
          {heading("Admin", "text-destructive")}
          {adminNav.map((entry) => (
            <NavItem
              key={entry.to}
              entry={entry}
              variant={variant}
              onNavigate={onNavigate}
            />
          ))}
        </>
      )}
    </nav>
  );
}
