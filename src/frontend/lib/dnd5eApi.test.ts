import { describe, expect, it } from "vitest";
import { monsterToDbForm, monsterToNpc, type DndMonster } from "./dnd5eApi";

const dragon: DndMonster = {
  index: "young-red-dragon",
  name: "Young Red Dragon",
  size: "Large",
  type: "dragon",
  alignment: "chaotic evil",
  hit_points: 178,
  hit_dice: "17d10",
  armor_class: [{ value: 18, type: "natural" }],
  speed: { walk: "40 ft.", fly: "80 ft." },
  strength: 23,
  dexterity: 10,
  constitution: 21,
  intelligence: 14,
  wisdom: 11,
  charisma: 19,
  challenge_rating: 10,
  xp: 5900,
  senses: { darkvision: "120 ft." },
  languages: "Common, Draconic",
  damage_resistances: [],
  damage_immunities: ["fire"],
  condition_immunities: [],
  actions: [
    {
      name: "Bite",
      desc: "Melee Weapon Attack: +10 to hit.",
      attack_bonus: 10,
      damage: [{ damage_dice: "2d10+6", damage_type: { index: "piercing", name: "Piercing" } }],
    },
  ],
  special_abilities: [{ name: "Fire Aura", desc: "Hot." }],
  legendary_actions: [{ name: "Tail", desc: "Swipe." }],
};

describe("monsterToNpc", () => {
  // It used to return only these four, so an SRD monster added straight to an
  // encounter had no stats, no actions and -- for this dragon -- no fire
  // immunity, which the damage pipeline reads.
  it("still derives the basics", () => {
    expect(monsterToNpc(dragon)).toMatchObject({
      name: "Young Red Dragon",
      hp: 178,
      ac: 18,
      initiative: 0,
    });
  });

  it("carries the full stat block the monster library would", () => {
    const npc = monsterToNpc(dragon);
    const db = monsterToDbForm(dragon);
    expect(npc).toMatchObject({
      str_score: 23,
      cha_score: 19,
      actions: db.actions,
      special_abilities: db.special_abilities,
      legendary_actions: [{ name: "Tail", desc: "Swipe." }],
      damage_immunities: ["fire"],
    });
  });
});
