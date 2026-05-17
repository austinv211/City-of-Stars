import type { AbilityName } from "../types/character.types";

// ── Species ───────────────────────────────────────────────────────────────────
// 2024 PHB: species grant no ability score increases
export const SPECIES = [
  "Aasimar",
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Goliath",
  "Halfling",
  "Human",
  "Orc",
  "Tiefling",
] as const;

// ── Classes ───────────────────────────────────────────────────────────────────
export interface ClassData {
  name: string;
  skillCount: number;           // number of skill proficiencies to choose
  skillChoices: string[];       // pool of skills to choose from
  savingThrows: AbilityName[]; // fixed saving throw proficiencies
  subclasses: string[];
  hitDie: number;
}

export const CLASSES: ClassData[] = [
  {
    name: "Barbarian",
    skillCount: 2,
    skillChoices: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"],
    savingThrows: ["strength", "constitution"],
    subclasses: ["Path of the Berserker", "Path of the Wild Heart", "Path of the World Tree", "Path of the Zealot"],
    hitDie: 12,
  },
  {
    name: "Bard",
    skillCount: 3,
    skillChoices: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"],
    savingThrows: ["dexterity", "charisma"],
    subclasses: ["College of Dance", "College of Glamour", "College of Lore", "College of Valor"],
    hitDie: 8,
  },
  {
    name: "Cleric",
    skillCount: 2,
    skillChoices: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
    savingThrows: ["wisdom", "charisma"],
    subclasses: ["Life Domain", "Light Domain", "Trickery Domain", "War Domain"],
    hitDie: 8,
  },
  {
    name: "Druid",
    skillCount: 2,
    skillChoices: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"],
    savingThrows: ["intelligence", "wisdom"],
    subclasses: ["Circle of the Land", "Circle of the Moon", "Circle of the Sea", "Circle of Stars"],
    hitDie: 8,
  },
  {
    name: "Fighter",
    skillCount: 2,
    skillChoices: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"],
    savingThrows: ["strength", "constitution"],
    subclasses: ["Battle Master", "Champion", "Eldritch Knight", "Psi Warrior"],
    hitDie: 10,
  },
  {
    name: "Monk",
    skillCount: 2,
    skillChoices: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"],
    savingThrows: ["strength", "dexterity"],
    subclasses: ["Warrior of the Elements", "Warrior of the Hand", "Warrior of the Open Hand", "Warrior of Shadow"],
    hitDie: 8,
  },
  {
    name: "Paladin",
    skillCount: 2,
    skillChoices: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"],
    savingThrows: ["wisdom", "charisma"],
    subclasses: ["Oath of Devotion", "Oath of Glory", "Oath of the Ancients", "Oath of Vengeance"],
    hitDie: 10,
  },
  {
    name: "Ranger",
    skillCount: 3,
    skillChoices: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"],
    savingThrows: ["strength", "dexterity"],
    subclasses: ["Beast Master", "Fey Wanderer", "Gloom Stalker", "Hunter"],
    hitDie: 10,
  },
  {
    name: "Rogue",
    skillCount: 4,
    skillChoices: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"],
    savingThrows: ["dexterity", "intelligence"],
    subclasses: ["Arcane Trickster", "Assassin", "Soulknife", "Thief"],
    hitDie: 8,
  },
  {
    name: "Sorcerer",
    skillCount: 2,
    skillChoices: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"],
    savingThrows: ["constitution", "charisma"],
    subclasses: ["Aberrant Sorcery", "Clockwork Sorcery", "Draconic Sorcery", "Wild Magic Sorcery"],
    hitDie: 6,
  },
  {
    name: "Warlock",
    skillCount: 2,
    skillChoices: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"],
    savingThrows: ["wisdom", "charisma"],
    subclasses: ["Archfey Patron", "Celestial Patron", "Fiend Patron", "Great Old One Patron"],
    hitDie: 8,
  },
  {
    name: "Wizard",
    skillCount: 2,
    skillChoices: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"],
    savingThrows: ["intelligence", "wisdom"],
    subclasses: ["Abjurer", "Diviner", "Evoker", "Illusionist"],
    hitDie: 6,
  },
];

// ── Backgrounds ───────────────────────────────────────────────────────────────
// 2024 PHB: each background grants +2 to one ability and +1 to another
export interface BackgroundData {
  name: string;
  primaryOptions: AbilityName[];   // ability that can get +2
  secondaryOptions: AbilityName[]; // ability that can get +1 (must differ from primary)
}

export const BACKGROUNDS: BackgroundData[] = [
  { name: "Acolyte", primaryOptions: ["intelligence", "wisdom", "charisma"], secondaryOptions: ["intelligence", "wisdom", "charisma"] },
  { name: "Artisan", primaryOptions: ["strength", "dexterity", "intelligence"], secondaryOptions: ["strength", "dexterity", "intelligence"] },
  { name: "Charlatan", primaryOptions: ["dexterity", "constitution", "charisma"], secondaryOptions: ["dexterity", "constitution", "charisma"] },
  { name: "Criminal", primaryOptions: ["dexterity", "constitution", "intelligence"], secondaryOptions: ["dexterity", "constitution", "intelligence"] },
  { name: "Entertainer", primaryOptions: ["strength", "dexterity", "charisma"], secondaryOptions: ["strength", "dexterity", "charisma"] },
  { name: "Farmer", primaryOptions: ["strength", "constitution", "wisdom"], secondaryOptions: ["strength", "constitution", "wisdom"] },
  { name: "Guard", primaryOptions: ["strength", "intelligence", "wisdom"], secondaryOptions: ["strength", "intelligence", "wisdom"] },
  { name: "Guide", primaryOptions: ["dexterity", "constitution", "wisdom"], secondaryOptions: ["dexterity", "constitution", "wisdom"] },
  { name: "Hermit", primaryOptions: ["constitution", "intelligence", "wisdom"], secondaryOptions: ["constitution", "intelligence", "wisdom"] },
  { name: "Merchant", primaryOptions: ["constitution", "intelligence", "charisma"], secondaryOptions: ["constitution", "intelligence", "charisma"] },
  { name: "Noble", primaryOptions: ["strength", "intelligence", "charisma"], secondaryOptions: ["strength", "intelligence", "charisma"] },
  { name: "Sage", primaryOptions: ["constitution", "intelligence", "wisdom"], secondaryOptions: ["constitution", "intelligence", "wisdom"] },
  { name: "Sailor", primaryOptions: ["strength", "dexterity", "wisdom"], secondaryOptions: ["strength", "dexterity", "wisdom"] },
  { name: "Scribe", primaryOptions: ["dexterity", "intelligence", "wisdom"], secondaryOptions: ["dexterity", "intelligence", "wisdom"] },
  { name: "Soldier", primaryOptions: ["strength", "dexterity", "constitution"], secondaryOptions: ["strength", "dexterity", "constitution"] },
  { name: "Wayfarer", primaryOptions: ["dexterity", "wisdom", "charisma"], secondaryOptions: ["dexterity", "wisdom", "charisma"] },
];

// ── Skills ────────────────────────────────────────────────────────────────────
export interface SkillData {
  name: string;
  ability: AbilityName;
}

export const SKILLS: SkillData[] = [
  { name: "Acrobatics", ability: "dexterity" },
  { name: "Animal Handling", ability: "wisdom" },
  { name: "Arcana", ability: "intelligence" },
  { name: "Athletics", ability: "strength" },
  { name: "Deception", ability: "charisma" },
  { name: "History", ability: "intelligence" },
  { name: "Insight", ability: "wisdom" },
  { name: "Intimidation", ability: "charisma" },
  { name: "Investigation", ability: "intelligence" },
  { name: "Medicine", ability: "wisdom" },
  { name: "Nature", ability: "intelligence" },
  { name: "Perception", ability: "wisdom" },
  { name: "Performance", ability: "charisma" },
  { name: "Persuasion", ability: "charisma" },
  { name: "Religion", ability: "intelligence" },
  { name: "Sleight of Hand", ability: "dexterity" },
  { name: "Stealth", ability: "dexterity" },
  { name: "Survival", ability: "wisdom" },
];

// ── Alignments ────────────────────────────────────────────────────────────────
export const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];

// ── Conditions ────────────────────────────────────────────────────────────────
export const CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Exhausted", "Frightened",
  "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious",
];

// ── Point Buy ─────────────────────────────────────────────────────────────────
// 2024 rules: 27 points, cost table
export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
