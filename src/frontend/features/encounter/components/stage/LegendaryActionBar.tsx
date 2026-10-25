import { useState } from "react";
import { Crown, Castle } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  EncounterParticipant,
  MonsterSpecialAbility,
} from "../../types/encounter.types";
import { lairActionDue, legendaryCost, legendaryCreatures } from "../../lib/legendary";

const DEFAULT_LAIR_COUNT = 20;

/**
 * The DM's legendary and lair controls, visible whenever they apply.
 *
 * Legendary actions are spent between other creatures' turns, so they live
 * here -- always on screen -- rather than in the creature's own panel, which
 * is only showing on its own turn.
 */
export function LegendaryActionBar({
  participants,
  activeId,
  turnSeq,
  lairInit,
  onSpend,
  onSetLair,
}: {
  participants: EncounterParticipant[];
  activeId: string | null;
  turnSeq: number;
  lairInit: number | null;
  onSpend: (
    creature: EncounterParticipant,
    action: MonsterSpecialAbility,
    cost: number,
  ) => void;
  onSetLair: (count: number | null) => void;
}) {
  const creatures = legendaryCreatures(participants);
  // Dismissal lasts for the turn it was made in.
  const [lairDoneAt, setLairDoneAt] = useState<number | null>(null);
  const lairDue =
    lairActionDue(participants, activeId, lairInit) && lairDoneAt !== turnSeq;
  const active = participants.find((p) => p.id === activeId);

  if (creatures.length === 0 && lairInit === null) return null;

  return (
    <section aria-label="Legendary and lair actions" className="space-y-2">
      {lairDue && (
        <div className="flex items-center gap-2 border border-secondary bg-secondary/15 p-2.5 text-sm">
          <Castle className="h-4 w-4 shrink-0 text-secondary" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">Lair action</span>{" "}
            <span className="text-muted-foreground">
              — initiative {lairInit}, before {active?.name ?? "the next turn"}
            </span>
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 border border-secondary/60"
            onClick={() => {
              setLairDoneAt(turnSeq);
            }}
          >
            Done
          </Button>
        </div>
      )}

      {creatures.map((c) => (
        <CreatureRow key={c.id} creature={c} onSpend={onSpend} />
      ))}

      <label
        htmlFor="lair-actions"
        className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-muted-foreground"
      >
        <input
          id="lair-actions"
          type="checkbox"
          className="h-4 w-4 accent-[var(--secondary)]"
          checked={lairInit !== null}
          onChange={(e) => {
            onSetLair(e.target.checked ? DEFAULT_LAIR_COUNT : null);
          }}
        />
        Lair actions on initiative {lairInit ?? DEFAULT_LAIR_COUNT}
      </label>
    </section>
  );
}

function CreatureRow({
  creature,
  onSpend,
}: {
  creature: EncounterParticipant;
  onSpend: (
    creature: EncounterParticipant,
    action: MonsterSpecialAbility,
    cost: number,
  ) => void;
}) {
  const { legendary_actions_max: max, legendary_actions_remaining: left } = creature;
  return (
    <div className="space-y-2 border border-primary/40 bg-primary/5 p-2.5">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {creature.name}
        </span>
        <span
          className="flex gap-1"
          aria-label={`${String(left)} of ${String(max)} legendary actions left`}
        >
          {Array.from({ length: max }, (_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                "h-3 w-3 rounded-full border border-primary",
                i < left && "bg-primary",
              )}
            />
          ))}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(creature.legendary_actions ?? []).map((a) => {
          const cost = legendaryCost(a);
          return (
            <Button
              key={a.name}
              size="sm"
              variant="ghost"
              className="h-8 border border-primary/40 text-xs"
              disabled={cost > left}
              title={a.desc}
              onClick={() => {
                onSpend(creature, a, cost);
              }}
            >
              {a.name.replace(/\s*\(costs?\s+\d+\s+actions?\)/i, "")}
              {cost > 1 && <span className="ml-1 text-muted-foreground">×{cost}</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
