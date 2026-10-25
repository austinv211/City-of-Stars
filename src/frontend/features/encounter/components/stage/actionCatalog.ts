import type { AbilityName } from "@/features/characters/types/character.types";
import type { ActionCategory } from "../../types/encounter.types";

/**
 * Static action-economy data: what each class can do with each slot, and how
 * each slot is coloured. Moved verbatim out of ActionPanel.
 */

export interface ActionEntry {
  id: string;
  label: string;
}

export const STANDARD_ACTIONS: ActionEntry[] = [
  { id: "attack", label: "Attack" },
  { id: "cast", label: "Cast a Spell" },
  { id: "dash", label: "Dash" },
  { id: "disengage", label: "Disengage" },
  { id: "dodge", label: "Dodge" },
  { id: "help", label: "Help" },
  { id: "hide", label: "Hide" },
  { id: "ready", label: "Ready" },
  { id: "search", label: "Search" },
  { id: "use_object", label: "Use Object" },
];

export const CLASS_BONUS_ACTIONS: Partial<Record<string, ActionEntry[]>> = {
  Barbarian: [
    { id: "rage", label: "Rage" },
    { id: "reckless_attack", label: "Reckless Attack" },
  ],
  Bard: [
    { id: "bardic_inspiration", label: "Bardic Inspiration" },
    { id: "healing_word", label: "Healing Word" },
  ],
  Cleric: [
    { id: "healing_word", label: "Healing Word" },
    { id: "spiritual_weapon", label: "Spiritual Weapon" },
  ],
  Druid: [
    { id: "wild_shape", label: "Wild Shape" },
    { id: "healing_word", label: "Healing Word" },
  ],
  Fighter: [
    { id: "second_wind", label: "Second Wind" },
    { id: "action_surge", label: "Action Surge" },
    { id: "two_weapon", label: "Two-Weapon Attack" },
  ],
  Monk: [
    { id: "flurry", label: "Flurry of Blows (1 Ki)" },
    { id: "patient_defense", label: "Patient Defense (1 Ki)" },
    { id: "step_wind", label: "Step of the Wind (1 Ki)" },
  ],
  Paladin: [
    { id: "divine_smite", label: "Divine Smite" },
    { id: "lay_on_hands", label: "Lay on Hands" },
  ],
  Ranger: [
    { id: "hunters_mark", label: "Hunter's Mark" },
    { id: "two_weapon", label: "Two-Weapon Attack" },
  ],
  Rogue: [
    { id: "cunning_action", label: "Cunning Action" },
    { id: "two_weapon", label: "Two-Weapon Attack" },
  ],
  Sorcerer: [
    { id: "quickened_spell", label: "Quickened Spell (2 SP)" },
    { id: "twinned_spell", label: "Twinned Spell" },
  ],
  Warlock: [{ id: "two_weapon", label: "Two-Weapon Attack" }],
  Wizard: [{ id: "two_weapon", label: "Two-Weapon Attack" }],
};

export const CLASS_REACTIONS: Partial<Record<string, ActionEntry[]>> = {
  Barbarian: [],
  Bard: [{ id: "cutting_words", label: "Cutting Words" }],
  Cleric: [],
  Druid: [],
  Fighter: [],
  Monk: [{ id: "deflect_missiles", label: "Deflect Missiles" }],
  Paladin: [
    { id: "divine_smite_reaction", label: "Smite (Reaction)" },
    { id: "aura_protection", label: "Aura of Protection" },
  ],
  Ranger: [],
  Rogue: [{ id: "uncanny_dodge", label: "Uncanny Dodge" }],
  Sorcerer: [],
  Warlock: [],
  Wizard: [
    { id: "shield", label: "Shield" },
    { id: "counterspell", label: "Counterspell" },
  ],
};

export const UNIVERSAL_REACTIONS: ActionEntry[] = [
  { id: "opportunity_attack", label: "Opportunity Attack" },
];

// ── Action slot label styles ───────────────────────────────────────────────

export const SLOT_BADGE: Record<ActionCategory, string> = {
  action: "bg-primary/15 text-primary",
  bonus: "bg-secondary/20 text-secondary",
  reaction: "bg-accent/60 text-accent-foreground",
  free: "bg-muted/20 text-muted-foreground",
};

export const SLOT_BTN: Record<ActionCategory, string> = {
  action: "bg-primary/10 text-primary hover:bg-primary/20 border-0",
  bonus: "bg-secondary/15 text-secondary hover:bg-secondary/25 border-0",
  reaction: "bg-accent/40 text-accent-foreground hover:bg-accent/60 border-0",
  free: "bg-muted/20 text-muted-foreground hover:bg-muted/40 border-0",
};

// Attack/cast highlighted differently; everything else uses slot color
export const ACTION_BTN_OVERRIDES: Partial<Record<string, string>> = {
  attack: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-0",
  cast: "bg-primary/10 text-primary hover:bg-primary/20 border-0",
};

export const SKILL_ABILITY: Partial<Record<string, AbilityName>> = {
  Acrobatics: "dexterity",
  "Animal Handling": "wisdom",
  Arcana: "intelligence",
  Athletics: "strength",
  Deception: "charisma",
  History: "intelligence",
  Insight: "wisdom",
  Intimidation: "charisma",
  Investigation: "intelligence",
  Medicine: "wisdom",
  Nature: "intelligence",
  Perception: "wisdom",
  Performance: "charisma",
  Persuasion: "charisma",
  Religion: "intelligence",
  "Sleight of Hand": "dexterity",
  Stealth: "dexterity",
  Survival: "wisdom",
};
