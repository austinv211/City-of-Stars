import { useCampaign } from "@/core/context/CampaignContext";
import { cn } from "@/lib/utils";
import { NavItem, type NavVariant } from "./NavItem";
import { useNavGroups, type NavGroup } from "./useNavGroups";

interface Props {
  variant: NavVariant;
  /** Called after any navigation — lets a containing sheet close itself. */
  onNavigate?: () => void;
  /**
   * Destinations to leave out. The phone More sheet passes whatever the tab
   * bar already shows, so nothing appears twice on one screen.
   */
  exclude?: readonly string[];
  className?: string;
}

/**
 * The full navigation tree, role-filtered, at the requested density.
 *
 * Shared by the desktop sidebar (variant "full"), the tablet rail ("icon") and
 * the phone More sheet ("tile"), so the role gating and the live-encounter dot
 * are implemented once. The variants differ only in how a group is laid out:
 * a column of rows, a column of icons, or a two-up grid of cards.
 */
export function NavSections({ variant, onNavigate, exclude = [], className }: Props) {
  const { activeEncounterId } = useCampaign();
  const groups = useNavGroups(exclude);
  const iconOnly = variant === "icon";
  const tiles = variant === "tile";

  const heading = (group: NavGroup, index: number) => {
    if (!group.heading) return null;
    if (iconOnly) {
      // A rail has no room for text headings; a divider carries the grouping.
      return (
        <div className="my-1.5 px-2" role="separator">
          <div className="h-px bg-border/60" />
        </div>
      );
    }
    return (
      <div
        className={
          tiles ? cn("px-1 pb-2", index === 0 ? "pt-1" : "pt-5") : "px-3 pb-1 pt-4"
        }
      >
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            group.heading.tone,
          )}
        >
          {group.heading.text}
        </p>
      </div>
    );
  };

  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex flex-col",
        iconOnly ? "items-center gap-1" : "gap-0.5",
        className,
      )}
    >
      {groups.map((group, index) => (
        <section
          key={group.key}
          aria-label={group.heading?.text}
          // Grouping is semantic only in the column layouts; the tile layout
          // needs real boxes so each group can be its own grid.
          className={tiles ? undefined : "contents"}
        >
          {heading(group, index)}
          <div className={tiles ? "grid grid-cols-2 gap-2" : "contents"}>
            {group.entries.map((entry) => {
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
          </div>
        </section>
      ))}
    </nav>
  );
}
