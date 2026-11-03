import type { RollEntry } from "../context/DiceContext";
import type { EncounterParticipant } from "../types/encounter.types";

/** A full participant row for tests, overridable per field. */
export function combatant(
  id: string,
  order: number,
  over: Partial<EncounterParticipant> = {},
) {
  return {
    id,
    encounter_id: "enc",
    character_id: null,
    name: id,
    nickname: null,
    portrait_url: null,
    art_url: null,
    initiative_order: order,
    initiative_score: 10,
    hp_current: 10,
    hp_max: 10,
    hp_temp: 0,
    ac: 12,
    conditions: [],
    is_player: true,
    owner_id: null,
    str_score: null,
    dex_score: null,
    con_score: null,
    int_score: null,
    wis_score: null,
    cha_score: null,
    actions: null,
    special_abilities: null,
    has_rolled_initiative: true,
    description: null,
    damage_resistances: [],
    damage_immunities: [],
    damage_vulnerabilities: [],
    concentrating_on: null,
    death_save_successes: 0,
    death_save_failures: 0,
    exhaustion: 0,
    heroic_inspiration: false,
    cover: "none",
    action_used: false,
    bonus_used: false,
    reaction_used: false,
    dodging: false,
    legendary_actions: null,
    legendary_actions_max: 0,
    legendary_actions_remaining: 0,
    ...over,
  } satisfies EncounterParticipant;
}

/** Grizzle (actor "g1") attacking Isolde with a Scimitar: 14 + 4 = 18. */
export function scimitarAttack(over: Partial<RollEntry> = {}): RollEntry {
  return {
    id: "r1",
    ts: 0,
    encounterId: "e",
    characterName: "Grizzle",
    rolledByDm: true,
    diceType: "1d20",
    result: 14,
    modifier: 4,
    total: 18,
    rollType: "Scimitar Attack",
    context: {
      kind: "attack",
      actorId: "g1",
      targetId: "isolde",
      source: { type: "monster_action", name: "Scimitar" },
    },
    ...over,
  };
}
