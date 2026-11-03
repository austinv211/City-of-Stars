import { useEffect, useRef } from "react";
import { Crosshair } from "lucide-react";
import { useReducedMotion } from "@/core/hooks/useFeelPrefs";
import { cn } from "@/lib/utils";
import { hpFraction } from "../../lib/attack";
import { CombatantThumb } from "../CombatantArt";
import type { EncounterParticipant } from "../../types/encounter.types";

/**
 * The initiative order as a horizontal strip, for the phone layout: always
 * visible, so whose turn it is and who is next never scrolls away. Tapping a
 * combatant shows their panel. The active combatant is scrolled into view as
 * turns advance.
 */
export function Filmstrip({
  participants,
  activeId,
  selectedId,
  targetId,
  ownId,
  isDM,
  onSelect,
}: {
  participants: EncounterParticipant[];
  activeId: string | null;
  selectedId: string | null;
  targetId: string | null;
  ownId: string | null;
  isDM: boolean;
  onSelect: (id: string) => void;
}) {
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [activeId, prefersReducedMotion]);

  return (
    <nav
      aria-label="Initiative order"
      data-scroll-container
      className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border/40 bg-card px-2 py-2"
    >
      {participants.map((p) => {
        const active = p.id === activeId;
        const viewing = p.id === selectedId;
        // Same visibility rule as the initiative cards: monster HP is the DM's.
        const showHp = isDM || p.is_player;
        const pct = hpFraction(p);
        return (
          <button
            key={p.id}
            ref={active ? activeRef : undefined}
            type="button"
            onClick={() => {
              onSelect(p.id);
            }}
            aria-current={active ? "step" : undefined}
            aria-pressed={viewing}
            aria-label={`${p.name}${active ? ", acting now" : ""}`}
            className={cn(
              "relative flex w-[4.75rem] shrink-0 flex-col items-center gap-1 border px-1 py-1.5",
              active && "bg-primary/10",
              viewing ? "border-primary" : "border-border/40",
            )}
          >
            <CombatantThumb
              participant={p}
              className={cn(
                "h-8 w-8 rounded-full text-[11px]",
                active && "ring-2 ring-primary",
                p.hp_current <= 0 && "opacity-50 grayscale",
              )}
            />
            <span className="w-full truncate text-center text-[11px] leading-tight">
              {p.id === ownId ? "You" : p.name}
            </span>
            {showHp && (
              <span className="h-1 w-full bg-muted" aria-hidden="true">
                <span
                  className={cn(
                    "block h-full",
                    pct > 0.5 ? "bg-success" : "bg-destructive",
                  )}
                  style={{ width: `${String(pct * 100)}%` }}
                />
              </span>
            )}
            {p.id === targetId && (
              <Crosshair
                className="absolute right-0.5 top-0.5 h-3.5 w-3.5 text-destructive"
                aria-label="Target"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
