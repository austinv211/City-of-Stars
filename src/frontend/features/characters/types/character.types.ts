export type CharacterStatus = "draft" | "active" | "backup";
export type AbilityScoreMethod = "point_buy" | "standard_array" | "rolled";
export type AbilityName = "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
export type ProficiencyType = "skill" | "saving_throw" | "tool" | "weapon" | "armor" | "language";

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface Character {
  id: string;
  campaign_id: string;
  owner_id: string;
  name: string;
  species: string;
  class: string;
  subclass: string | null;
  background: string;
  level: number;
  portrait_url: string | null;
  status: CharacterStatus;
  is_locked: boolean;
  backstory: string | null;
  alignment: string | null;
  currency_dollars: number;
  spellcasting_ability: string | null;
  // Vital stats
  ac: number | null;
  speed: number;
  // HP tracking
  hp_max: number | null;
  hp_current: number | null;
  hp_temp: number;
  hit_dice_current: number | null;
  // Death saves
  death_save_successes: number;
  death_save_failures: number;
  // Personality & roleplay
  personality_traits: string | null;
  ideals: string | null;
  bonds: string | null;
  flaws: string | null;
  features_notes: string | null;
  // Homebrew
  will_of_void: number;
  will_of_void_notes: string | null;
  // Proficiency categories
  armor_proficiencies: string[];
  weapon_proficiencies: string[];
  tool_proficiencies: string[];
  languages_known: string[];
  saving_throw_proficiencies: string[];
  // Level-up gate
  level_up_pending: boolean;
}

export interface CharacterSpellSlot {
  id: string;
  character_id: string;
  spell_level: number;
  slots_total: number;
  slots_expended: number;
}

export interface CharacterAbilityScores extends AbilityScores {
  method: AbilityScoreMethod;
  background_bonus_primary: AbilityName | null;
  background_bonus_secondary: AbilityName | null;
}

export interface CharacterProficiency {
  id: string;
  character_id: string;
  skill: string;
  source: "class" | "background" | "feat";
  is_expertise: boolean;
}

export interface CharacterInventoryItem {
  id: string;
  character_id: string;
  item_name: string;
  quantity: number;
  description: string | null;
  weight: number | null;
  is_equipped: boolean;
}

export interface CharacterAttack {
  id: string;
  character_id: string;
  name: string;
  attack_modifier: number;
  dice_count: number;
  dice_sides: number;
  damage_modifier: number;
  damage_type: string;
  is_ranged: boolean;
  is_spell: boolean;
  notes: string | null;
}

export interface CharacterSpell {
  id: string;
  character_id: string;
  name: string;
  level: number;
  school: string | null;
  is_prepared: boolean;
  is_ritual: boolean;
  concentration: boolean;
  casting_time: string | null;
  range_text: string | null;
  components: string[] | null;
  description: string | null;
  damage_type: string | null;
  attack_type: string | null;
  damage_dice: string | null;
}

export interface CharacterWithScores extends Character {
  ability_scores: CharacterAbilityScores | null;
  proficiencies: CharacterProficiency[];
}

export interface DerivedStats {
  proficiencyBonus: number;
  initiative: number;
  passivePerception: number;
  modifiers: AbilityScores;
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function deriveStats(scores: AbilityScores, level: number): DerivedStats {
  const modifiers: AbilityScores = {
    strength: abilityModifier(scores.strength),
    dexterity: abilityModifier(scores.dexterity),
    constitution: abilityModifier(scores.constitution),
    intelligence: abilityModifier(scores.intelligence),
    wisdom: abilityModifier(scores.wisdom),
    charisma: abilityModifier(scores.charisma),
  };
  return {
    proficiencyBonus: Math.floor((level - 1) / 4) + 2,
    initiative: modifiers.dexterity,
    passivePerception: 10 + modifiers.wisdom,
    modifiers,
  };
}

export function finalAbilityScores(
  scores: AbilityScores,
  primary: AbilityName | null | undefined,
  secondary: AbilityName | null | undefined
): AbilityScores {
  const result = { ...scores };
  if (primary) result[primary] = result[primary] + 2;
  if (secondary) result[secondary] = result[secondary] + 1;
  return result;
}

// ── Wizard state ──────────────────────────────────────────────────────────────

export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  // Step 1
  name: string;
  species: string;
  characterClass: string;
  subclass: string;
  // Step 2
  background: string;
  backgroundBonusPrimary: AbilityName;
  backgroundBonusSecondary: AbilityName;
  backstory: string;
  alignment: string;
  // Step 3
  abilityScoreMethod: AbilityScoreMethod;
  baseAbilityScores: AbilityScores;
  // Step 4
  skillProficiencies: string[];
  // Step 5
  portraitFile: File | null;
  portraitPreviewUrl: string | null;
}

export const BLANK_SCORES: AbilityScores = {
  strength: 8,
  dexterity: 8,
  constitution: 8,
  intelligence: 8,
  wisdom: 8,
  charisma: 8,
};

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  name: "",
  species: "",
  characterClass: "",
  subclass: "",
  background: "",
  backgroundBonusPrimary: "strength",
  backgroundBonusSecondary: "dexterity",
  backstory: "",
  alignment: "",
  abilityScoreMethod: "standard_array",
  baseAbilityScores: { ...BLANK_SCORES },
  skillProficiencies: [],
  portraitFile: null,
  portraitPreviewUrl: null,
};

export type WizardAction =
  | { type: "SET_STEP"; step: WizardState["step"] }
  | { type: "SET_FIELD"; field: keyof WizardState; value: WizardState[keyof WizardState] }
  | { type: "SET_SCORE"; ability: AbilityName; value: number }
  | { type: "TOGGLE_SKILL"; skill: string; max: number };

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_SCORE":
      return {
        ...state,
        baseAbilityScores: { ...state.baseAbilityScores, [action.ability]: action.value },
      };
    case "TOGGLE_SKILL": {
      const has = state.skillProficiencies.includes(action.skill);
      if (has) {
        return { ...state, skillProficiencies: state.skillProficiencies.filter((s) => s !== action.skill) };
      }
      if (state.skillProficiencies.length >= action.max) return state;
      return { ...state, skillProficiencies: [...state.skillProficiencies, action.skill] };
    }
    default:
      return state;
  }
}
