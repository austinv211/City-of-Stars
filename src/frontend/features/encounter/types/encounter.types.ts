export type EncounterStatus = "pending" | "active" | "completed";

export interface MonsterAction {
  name: string;
  desc: string;
  attack_bonus?: number;
  damage_dice?: string;
  damage_type?: string;
}

export interface MonsterSpecialAbility {
  name: string;
  desc: string;
}

export interface Encounter {
  id: string;
  campaign_id: string;
  status: EncounterStatus;
  name: string | null;
  created_by: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  current_participant_id: string | null;
}

export interface EncounterParticipant {
  id: string;
  encounter_id: string;
  character_id: string | null;
  name: string;
  portrait_url: string | null;
  initiative_order: number;
  initiative_score: number;
  hp_current: number;
  hp_max: number;
  hp_temp: number;
  ac: number;
  conditions: string[];
  is_player: boolean;
  owner_id: string | null;
  str_score: number | null;
  dex_score: number | null;
  con_score: number | null;
  int_score: number | null;
  wis_score: number | null;
  cha_score: number | null;
  actions: MonsterAction[] | null;
  special_abilities: MonsterSpecialAbility[] | null;
}

export interface DiceRoll {
  id: string;
  campaign_id: string;
  encounter_id: string | null;
  user_id: string;
  character_name: string;
  dice_type: string;
  result: number;
  modifier: number;
  total: number;
  roll_type: string;
  created_at: string;
}

export interface DiceRollBroadcast {
  characterName: string;
  diceType: string;
  result: number;
  modifier: number;
  total: number;
  rollType: string;
}
