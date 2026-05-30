// Spell slot tables by class and level. Mirrors srd_classes.spell_slots_by_level
// (kept in sync by scripts/check-srd-consistency.ts). Pure data — no runtime deps
// so it can be imported by both the app and the consistency guard.
// Key: array of 9 slot counts per spell level for each character level 1-20.
// Each row: index = character_level - 1, value = [L1, L2, L3, L4, L5, L6, L7, L8, L9]
const FULL_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // level 1
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // level 2
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // level 3
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // level 4
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // level 5
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // level 6
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // level 7
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // level 8
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // level 9
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // level 10
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // level 11
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // level 12
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // level 13
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // level 14
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // level 15
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // level 16
  [4, 3, 3, 3, 2, 1, 1, 1, 1], // level 17
  [4, 3, 3, 3, 3, 1, 1, 1, 1], // level 18
  [4, 3, 3, 3, 3, 2, 1, 1, 1], // level 19
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // level 20
];

const HALF_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
];

// Third casters (Eldritch Knight, Arcane Trickster). Spellcasting begins at
// level 3 and tops out at 4th-level slots. Index = character_level - 1.
const THIRD_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0], // 1
  [0, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 3
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 4
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 5
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // 6
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 7
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 8
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // 9
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 10
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 11
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // 12
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 13
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 14
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // 15
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 16
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 17
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // 18
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 19
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // 20
];

// Warlock Pact Magic — a few slots, all of a single level, that recharge on a
// short rest. Mirrors srd_classes.spell_slots_by_level. Index = character_level - 1.
const WARLOCK_PACT_SLOTS: number[][] = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0], // 1
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // 2
  [0, 2, 0, 0, 0, 0, 0, 0, 0], // 3
  [0, 2, 0, 0, 0, 0, 0, 0, 0], // 4
  [0, 0, 2, 0, 0, 0, 0, 0, 0], // 5
  [0, 0, 2, 0, 0, 0, 0, 0, 0], // 6
  [0, 0, 0, 2, 0, 0, 0, 0, 0], // 7
  [0, 0, 0, 2, 0, 0, 0, 0, 0], // 8
  [0, 0, 0, 0, 2, 0, 0, 0, 0], // 9
  [0, 0, 0, 0, 2, 0, 0, 0, 0], // 10
  [0, 0, 0, 0, 3, 0, 0, 0, 0], // 11
  [0, 0, 0, 0, 3, 0, 0, 0, 0], // 12
  [0, 0, 0, 0, 3, 0, 0, 0, 0], // 13
  [0, 0, 0, 0, 3, 0, 0, 0, 0], // 14
  [0, 0, 0, 0, 3, 0, 0, 0, 0], // 15
  [0, 0, 0, 0, 3, 0, 0, 0, 0], // 16
  [0, 0, 0, 0, 4, 0, 0, 0, 0], // 17
  [0, 0, 0, 0, 4, 0, 0, 0, 0], // 18
  [0, 0, 0, 0, 4, 0, 0, 0, 0], // 19
  [0, 0, 0, 0, 4, 0, 0, 0, 0], // 20
];

const FULL_CASTER_CLASSES = ["bard", "cleric", "druid", "sorcerer", "wizard"];
const HALF_CASTER_CLASSES = ["paladin", "ranger"];
const THIRD_CASTER_SUBCLASSES = ["eldritch knight", "arcane trickster"];

export function slotsForClass(className: string, level: number, subclass?: string | null): number[] {
  const idx = Math.max(0, Math.min(19, level - 1));
  const key = className.toLowerCase();
  if (key === "warlock") return WARLOCK_PACT_SLOTS[idx];
  if (FULL_CASTER_CLASSES.includes(key)) return FULL_CASTER_SLOTS[idx];
  if (HALF_CASTER_CLASSES.includes(key)) return HALF_CASTER_SLOTS[idx];
  if (subclass && THIRD_CASTER_SUBCLASSES.includes(subclass.toLowerCase())) {
    return THIRD_CASTER_SLOTS[idx];
  }
  return Array(9).fill(0);
}
