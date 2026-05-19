export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  current_session: number;
  session_label: string;
}

export interface CampaignMember {
  id: string;
  campaign_id: string;
  user_id: string;
  role: "dm" | "player";
  joined_at: string;
}

export type SessionNoteVisibility = "dm_only" | "party";

export interface SessionNote {
  id: string;
  campaign_id: string;
  session_number: number;
  visibility: SessionNoteVisibility;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface EncounterStats {
  total_damage_dealt: number;
  total_hp_lost: number;
  total_hp_healed: number;
  total_crits: number;
  total_fumbles: number;
  monsters_defeated: number;
}

export interface PartyStats {
  id: string;
  campaign_id: string;
  stats: Partial<EncounterStats> & Record<string, unknown>;
  updated_at: string;
  void_alignment: number;
}

export interface CharacterCampaignStats {
  id: string;
  character_id: string;
  campaign_id: string;
  stats: Record<string, unknown>;
  updated_at: string;
}
