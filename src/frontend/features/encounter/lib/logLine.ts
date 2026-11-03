import type { RollEntry } from "../context/DiceContext";
import type { ActionCategory, EncounterParticipant, RollKind } from "../types/encounter.types";
import { judgeAttack, targetInfo, type AttackVerdict } from "./attack";

/** One log entry, worked out for one viewer. */
export interface LogLine {
  actor: string;
  /** Who it was aimed at, if anyone. */
  target: string | null;
  /** The ability used ("Scimitar"), or the roll's own label ("DEX Save"). */
  title: string;
  /** "Attack", "Damage"…; null when the title already says it. */
  kind: string | null;
  /** null for an announced action. */
  total: number | null;
  /** "1d20 (14+4)": hidden from players on the DM's monster rolls. */
  breakdown: string | null;
  /** DM only: the attack against the target's AC. */
  verdict: { verdict: AttackVerdict; ac: number } | null;
  badges: ("crit" | "fumble" | "adv" | "dis")[];
  /** Announced actions. */
  category?: ActionCategory;
  actionText?: string;
  /** For the source card: whose ability, and what kind. */
  actorParticipant: EncounterParticipant | null;
}

const KIND_LABEL: Partial<Record<RollKind, string>> = {
  attack: "Attack",
  damage: "Damage",
};

const sign = (n: number) => (n >= 0 ? `+${String(n)}` : String(n));

function breakdownOf(e: RollEntry): string {
  let text = e.modifier !== 0 ? `${e.diceType} (${String(e.result)}${sign(e.modifier)})` : e.diceType;
  if (e.discardedRoll != null) text += ` · kept ${String(e.result)}, dropped ${String(e.discardedRoll)}`;
  return text;
}

function badgesOf(e: RollEntry, d20: boolean): LogLine["badges"] {
  const badges: LogLine["badges"] = [];
  if (d20 && e.result === 20) badges.push("crit");
  if (d20 && e.result === 1) badges.push("fumble");
  if (e.context?.crit) badges.push("crit");
  if (e.advantage) badges.push("adv");
  if (e.disadvantage) badges.push("dis");
  return badges;
}

/** Who acted and at whom, by the viewer's names; a DM roll with no actor says so. */
function people(e: RollEntry, participants: EncounterParticipant[]) {
  const byId = (id: string | null | undefined) => participants.find((p) => p.id === id) ?? null;
  const actorP = byId(e.context?.actorId);
  const targetP = byId(e.context?.targetId);
  let actor = e.characterName;
  if (actorP) actor = actorP.name;
  else if (e.rolledByDm) actor = `DM — ${e.characterName}`;
  return { actor, actorParticipant: actorP, target: targetP?.name ?? null, targetP };
}

/** The DM's call on an attack against the target's AC, with cover. */
function verdictOf(e: RollEntry, target: EncounterParticipant | null, viewerIsDM: boolean) {
  if (!viewerIsDM || e.context?.kind !== "attack" || !target) return null;
  const ac = targetInfo(true, target).ac ?? target.ac;
  return { verdict: judgeAttack(e.total, e.modifier, ac), ac };
}

function kindLabel(e: RollEntry): string | null {
  const kind = e.context?.kind;
  // Without a source the label already says it: "DEX Save", "Perception Check".
  if (!kind || !e.context?.source) return null;
  return KIND_LABEL[kind] ?? null;
}

/** An announced action: what was done, no dice. */
function actionLine(e: RollEntry, who: Omit<ReturnType<typeof people>, "targetP">): LogLine {
  return {
    ...who,
    title: e.actionText ?? e.context?.source?.name ?? "Action",
    kind: null,
    total: null,
    breakdown: null,
    verdict: null,
    badges: [],
    category: e.actionCategory ?? "action",
    actionText: e.actionText,
  };
}

export function describeRoll(
  e: RollEntry,
  participants: EncounterParticipant[],
  viewerIsDM: boolean,
): LogLine {
  const { targetP, ...who } = people(e, participants);
  if (e.kind === "action") return actionLine(e, who);

  // A DM roll for a monster or NPC: players see what happened, not its numbers.
  const secret = !viewerIsDM && !!e.rolledByDm && !who.actorParticipant?.is_player;
  const d20 = /^1?d20$/.test(e.diceType) && e.context?.kind !== "damage";
  return {
    ...who,
    title: e.context?.source?.name ?? e.rollType,
    kind: kindLabel(e),
    total: e.total,
    breakdown: secret ? null : breakdownOf(e),
    verdict: verdictOf(e, targetP, viewerIsDM),
    badges: badgesOf(e, d20),
  };
}
