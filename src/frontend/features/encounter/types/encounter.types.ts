export type EncounterStatus = "pending" | "active" | "completed";

export interface Encounter {
  id: string;
  campaign_id: string;
  status: EncounterStatus;
  name: string | null;
  created_at: string;
}

export interface EncounterParticipant {
  id: string;
  encounter_id: string;
  character_id: string | null;
  name: string;
  initiative: number;
  initiative_order: number;
  hp_current: number;
  hp_max: number;
  hp_temp: number;
  ac: number;
  conditions: string[];
  is_npc: boolean;
  portrait_url: string | null;
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
