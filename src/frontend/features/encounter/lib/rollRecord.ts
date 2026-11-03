import type { Database, Json } from "@/types/database";
import type { DiceRollBroadcast, RollContext } from "../types/encounter.types";

type RollRow = Database["public"]["Tables"]["dice_rolls"]["Row"];

/** Everything about a roll beyond its numbers, as stored in `dice_rolls.context`. */
type StoredContext = Partial<RollContext> &
  Pick<
    DiceRollBroadcast,
    "advantage" | "disadvantage" | "discardedRoll" | "rolls" | "actionText" | "actionCategory"
  >;

/** The `context` column for a roll, so a reload shows it as it was. */
export function storedContext(b: DiceRollBroadcast): Json {
  const stored: StoredContext = {
    ...b.context,
    ...(b.kind === "action" ? { kind: "action" } : {}),
    advantage: b.advantage,
    disadvantage: b.disadvantage,
    discardedRoll: b.discardedRoll,
    rolls: b.rolls,
    actionText: b.actionText,
    actionCategory: b.actionCategory,
  };
  // JSON drops undefined fields, which keeps the column small.
  return JSON.parse(JSON.stringify(stored)) as Json;
}

/** A stored roll back into the shape the log renders. */
export function rollFromRow(
  r: RollRow,
): DiceRollBroadcast & { id: string; ts: number; encounterId: string | null } {
  const c = (r.context ?? {}) as StoredContext;
  const { advantage, disadvantage, discardedRoll, rolls, actionText, actionCategory, ...ctx } = c;
  const isAction = ctx.kind === "action";
  return {
    id: r.id,
    ts: new Date(r.rolled_at).getTime(),
    characterName: r.character_name ?? "Unknown",
    rolledByDm: r.rolled_by_dm,
    diceType: r.dice_type,
    result: r.result,
    modifier: r.modifier,
    total: r.total,
    rollType: r.roll_type,
    encounterId: r.encounter_id,
    advantage,
    disadvantage,
    discardedRoll,
    rolls: rolls ?? [],
    context: ctx.kind ? (ctx as RollContext) : undefined,
    ...(isAction ? { kind: "action" as const, actionText, actionCategory } : {}),
  };
}

/**
 * Whether a roll dealt damage, for the party's damage tally. Rolls with a
 * context say so; older ones and quick rolls are judged by their label.
 */
export function isDamageRoll(b: Pick<DiceRollBroadcast, "context" | "rollType">): boolean {
  if (b.context) return b.context.kind === "damage";
  const label = b.rollType.toLowerCase();
  return label.includes("dmg") || label.includes("damage");
}
