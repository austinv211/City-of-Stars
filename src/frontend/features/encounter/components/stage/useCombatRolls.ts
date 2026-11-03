import { buzz, HAPTIC } from "@/core/lib/haptics";
import { useDice, type PoolRollOptions } from "../../context/DiceContext";
import type {
  ActionCategory,
  EncounterParticipant,
  RollContext,
  RollKind,
  RollSource,
} from "../../types/encounter.types";

export type TurnFlag = "action_used" | "bonus_used" | "reaction_used" | "dodging";

type PoolArgs = Pick<
  PoolRollOptions,
  "pool" | "modifier" | "advantage" | "disadvantage" | "rollType"
>;

/** What a roll is for; the actor and target are filled in here. */
export interface RollMeta {
  kind: RollKind;
  source?: RollSource;
  crit?: boolean;
}

export interface CombatRolls {
  /** A single damage-style roll, e.g. "2d6" +3. Resolves to the total. */
  doRoll: (
    diceType: string,
    sides: number,
    modifier: number,
    rollType: string,
    meta?: RollMeta,
  ) => Promise<number>;
  /**
   * A d20 test. Goes through rollPool because only that path supports
   * advantage/disadvantage. Resolves to the kept total.
   */
  rollD20: (
    modifier: number,
    rollType: string,
    opts?: { advantage?: boolean; disadvantage?: boolean },
    meta?: RollMeta,
  ) => Promise<number>;
  rollPool: (args: PoolArgs) => Promise<number>;
  /**
   * Announce an action to the table and claim its slot. Named spendAction, not
   * useAction: it is not a hook, and the `use` prefix made the hooks linter
   * report it as one.
   */
  spendAction: (
    label: string,
    category: ActionCategory,
    actionId?: string,
    source?: RollSource,
  ) => void;
}

/** Rolls aimed at someone: the rest (saves, checks) are the roller's own. */
const AIMED: ReadonlySet<RollKind> = new Set(["attack", "damage", "action"]);

/** Roll and announce as one combatant, attributed and broadcast to the table. */
export function useCombatRolls({
  participant,
  campaignId,
  encounterId,
  isDM,
  targetId = null,
  onSetTurnFlag,
}: {
  participant: EncounterParticipant;
  campaignId: string;
  encounterId: string;
  isDM: boolean;
  /** Who this combatant is aiming at, recorded with attacks and damage. */
  targetId?: string | null;
  onSetTurnFlag: (flag: TurnFlag, value: boolean) => void;
}): CombatRolls {
  const { roll, rollPool, announceAction } = useDice();
  const base = {
    campaignId,
    encounterId,
    // The name everyone may see: a nickname or "Goblin A", never the DM's
    // "Grizzle (Goblin)". The log shows each viewer their own label anyway.
    characterName: participant.nickname ?? participant.name,
    rolledByDm: isDM,
  };
  const context = (meta: RollMeta = { kind: "other" }): RollContext => ({
    ...meta,
    actorId: participant.id,
    targetId: AIMED.has(meta.kind) ? targetId : null,
  });

  return {
    doRoll: (diceType, sides, modifier, rollType, meta) =>
      roll({ ...base, diceType, sides, modifier, rollType, context: context(meta) }),
    rollD20: (modifier, rollType, opts, meta) =>
      onNatural20(
        modifier,
        rollPool({
          ...base,
          pool: [{ sides: 20, count: 1 }],
          modifier,
          advantage: opts?.advantage ?? false,
          disadvantage: opts?.disadvantage ?? false,
          rollType,
          context: context(meta),
        }),
      ),
    rollPool: (args) => rollPool({ ...base, ...args, context: context() }),
    spendAction(label, category, actionId, source) {
      announceAction({
        ...base,
        actionText: label,
        actionCategory: category,
        context: context({ kind: "action", source }),
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

/** A d20's total minus its modifier is the face that landed (adv/dis too). */
function onNatural20(modifier: number, roll: Promise<number>): Promise<number> {
  return roll.then((total) => {
    if (total - modifier >= 20) buzz(HAPTIC.crit);
    return total;
  });
}
