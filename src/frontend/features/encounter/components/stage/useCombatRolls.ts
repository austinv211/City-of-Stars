import { useDice, type PoolRollOptions } from "../../context/DiceContext";
import type { ActionCategory, EncounterParticipant } from "../../types/encounter.types";

export type TurnFlag = "action_used" | "bonus_used" | "reaction_used" | "dodging";

type PoolArgs = Pick<
  PoolRollOptions,
  "pool" | "modifier" | "advantage" | "disadvantage" | "rollType"
>;

export interface CombatRolls {
  /** A single damage-style roll, e.g. "2d6" +3. Resolves to the total. */
  doRoll: (
    diceType: string,
    sides: number,
    modifier: number,
    rollType: string,
  ) => Promise<number>;
  /**
   * A d20 test. Goes through rollPool because only that path supports
   * advantage/disadvantage. Resolves to the kept total.
   */
  rollD20: (
    modifier: number,
    rollType: string,
    opts?: { advantage?: boolean; disadvantage?: boolean },
  ) => Promise<number>;
  rollPool: (args: PoolArgs) => Promise<number>;
  /**
   * Announce an action to the table and claim its slot. Named spendAction, not
   * useAction: it is not a hook, and the `use` prefix made the hooks linter
   * report it as one.
   */
  spendAction: (label: string, category: ActionCategory, actionId?: string) => void;
}

/** Roll and announce as one combatant, attributed and broadcast to the table. */
export function useCombatRolls({
  participant,
  campaignId,
  encounterId,
  isDM,
  onSetTurnFlag,
}: {
  participant: EncounterParticipant;
  campaignId: string;
  encounterId: string;
  isDM: boolean;
  onSetTurnFlag: (flag: TurnFlag, value: boolean) => void;
}): CombatRolls {
  const { roll, rollPool, announceAction } = useDice();
  const base = {
    campaignId,
    encounterId,
    characterName: participant.name,
    rolledByDm: isDM,
  };

  return {
    doRoll: (diceType, sides, modifier, rollType) =>
      roll({ ...base, diceType, sides, modifier, rollType }),
    rollD20: (modifier, rollType, opts) =>
      rollPool({
        ...base,
        pool: [{ sides: 20, count: 1 }],
        modifier,
        advantage: opts?.advantage ?? false,
        disadvantage: opts?.disadvantage ?? false,
        rollType,
      }),
    rollPool: (args) => rollPool({ ...base, ...args }),
    spendAction(label, category, actionId) {
      announceAction({
        campaignId,
        encounterId,
        characterName: participant.name,
        actionText: label,
        actionCategory: category,
      });
      // Claim the slot for the turn so the buttons gate further use.
      if (category === "action") onSetTurnFlag("action_used", true);
      else if (category === "bonus") onSetTurnFlag("bonus_used", true);
      else if (category === "reaction") onSetTurnFlag("reaction_used", true);
      // Dodge also sets the dodging flag, cleared at the start of this
      // combatant's next turn by advance_encounter_turn.
      if (actionId === "dodge") onSetTurnFlag("dodging", true);
    },
  };
}
