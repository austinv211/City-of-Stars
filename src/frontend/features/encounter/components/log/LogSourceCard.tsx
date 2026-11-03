import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { useHoverPopover } from "@/core/hooks/useHoverPopover";
import { useSourceDescription } from "../../hooks/useSourceDescription";
import type { EncounterParticipant, RollSource } from "../../types/encounter.types";
import { renderInline } from "../stage/renderInline";

const SOURCE_LABEL: Record<RollSource["type"], string> = {
  weapon: "Weapon",
  spell: "Spell",
  monster_action: "Action",
  legendary: "Legendary action",
  standard_action: "Action",
  unarmed: "Unarmed strike",
};

/**
 * The ability behind a log entry, on hover (or tap): what it does, and for a
 * monster, who it is. Players get the monster's flavour without its numbers.
 */
export function LogSourceCard({
  source,
  actor,
  viewerIsDM,
  children,
}: {
  source: RollSource;
  actor: EncounterParticipant | null;
  viewerIsDM: boolean;
  /** The entry's title, which opens the card. */
  children: ReactNode;
}) {
  const hover = useHoverPopover();
  const text = useSourceDescription(actor, source, viewerIsDM, hover.open);
  const monster = actor && !actor.is_player ? actor : null;

  return (
    <Popover open={hover.open} onOpenChange={hover.setOpen}>
      <PopoverTrigger
        className="min-w-0 truncate text-left font-semibold text-foreground underline decoration-dotted underline-offset-2 hover:text-primary"
        onMouseEnter={hover.onMouseEnter}
        onMouseLeave={hover.onMouseLeave}
        // A tap opens it; a click after hovering must not toggle it shut.
        onClick={(e) => {
          e.preventDefault();
          hover.setOpen(true);
        }}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-72 space-y-2 p-3 text-xs"
        side="left"
        align="start"
        onMouseEnter={hover.onMouseEnter}
        onMouseLeave={hover.onMouseLeave}
      >
        <div className="flex items-center gap-2">
          {monster?.portrait_url && (
            <img src={monster.portrait_url} alt="" className="h-9 w-9 shrink-0 object-cover" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{source.name}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {SOURCE_LABEL[source.type]}
              {actor && ` · ${actor.name}`}
            </p>
          </div>
        </div>
        {text ? (
          <p className="leading-relaxed text-muted-foreground">{renderInline(text)}</p>
        ) : (
          <p className="italic text-muted-foreground">No description.</p>
        )}
        {monster?.description && (
          <p className="border-t border-border/40 pt-2 italic leading-relaxed text-muted-foreground">
            {monster.description}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
