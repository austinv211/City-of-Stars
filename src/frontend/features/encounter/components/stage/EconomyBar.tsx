import { Button } from "@/core/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionCategory, EncounterParticipant } from "../../types/encounter.types";
import {
  ACTION_BTN_OVERRIDES,
  CLASS_BONUS_ACTIONS,
  CLASS_REACTIONS,
  SLOT_BADGE,
  SLOT_BTN,
  STANDARD_ACTIONS,
  UNIVERSAL_REACTIONS,
  type ActionEntry,
} from "./actionCatalog";
import type { CombatRolls, TurnFlag } from "./useCombatRolls";

type SlotCategory = Exclude<ActionCategory, "free">;

const SLOT_FLAG: Record<SlotCategory, TurnFlag> = {
  action: "action_used",
  bonus: "bonus_used",
  reaction: "reaction_used",
};

const SLOT_LABEL: Record<SlotCategory, string> = {
  action: "Action",
  bonus: "Bonus",
  reaction: "Reaction",
};

/**
 * All three slots refresh at the start of the combatant's own turn (the 2024
 * rule; advance_encounter_turn resets them). The reaction's label used to say
 * "used this round", which was the label being wrong, not the behaviour.
 */
const USED_NOTE = "used — back at the start of your turn";

/** The player's action economy: Action, Bonus and Reaction, each claimable once per turn. */
export function EconomyBar({
  participant,
  characterClass,
  rolls,
  locked,
  onSetTurnFlag,
}: {
  participant: EncounterParticipant;
  characterClass: string;
  rolls: CombatRolls;
  locked: boolean;
  onSetTurnFlag: (flag: TurnFlag, value: boolean) => void;
}) {
  const bonusActions = CLASS_BONUS_ACTIONS[characterClass] ?? [];
  const reactions = [
    ...UNIVERSAL_REACTIONS,
    ...(CLASS_REACTIONS[characterClass] ?? []),
  ];

  const row = (category: SlotCategory, entries: ActionEntry[]) => (
    <SlotRow
      category={category}
      entries={entries}
      used={participant[SLOT_FLAG[category]]}
      locked={locked}
      onSpend={(a) => {
        rolls.spendAction(a.label, category, a.id);
      }}
      onReset={() => {
        onSetTurnFlag(SLOT_FLAG[category], false);
      }}
    />
  );

  return (
    <div className="space-y-2">
      {row("action", STANDARD_ACTIONS)}
      {bonusActions.length > 0 && row("bonus", bonusActions)}
      {row("reaction", reactions)}
    </div>
  );
}

function SlotRow({
  category,
  entries,
  used,
  locked,
  onSpend,
  onReset,
}: {
  category: SlotCategory;
  entries: ActionEntry[];
  used: boolean;
  locked: boolean;
  onSpend: (a: ActionEntry) => void;
  onReset: () => void;
}) {
  const unavailable = locked || used;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className={cn(
            "px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
            SLOT_BADGE[category],
          )}
        >
          {SLOT_LABEL[category]}
        </span>
        {used && (
          <span className="text-[10px] italic text-muted-foreground">{USED_NOTE}</span>
        )}
        {used && (
          <button
            type="button"
            disabled={locked}
            onClick={onReset}
            className="ml-auto text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            title="DM override: refresh this slot"
          >
            reset
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((a) => (
          <Button
            key={a.id}
            size="sm"
            variant="ghost"
            disabled={unavailable}
            onClick={() => {
              onSpend(a);
            }}
            className={cn(
              "h-7 px-2 text-xs",
              (category === "action" ? ACTION_BTN_OVERRIDES[a.id] : undefined) ??
                SLOT_BTN[category],
              unavailable && "opacity-50",
            )}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
