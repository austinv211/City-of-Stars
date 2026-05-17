export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface CampaignMember {
  id: string;
  campaign_id: string;
  user_id: string;
  role: "dm" | "player";
  joined_at: string;
}

export interface CampaignNotes {
  id: string;
  campaign_id: string;
  session_notes: string | null;
  campaign_details: string | null;
  updated_at: string;
}

export interface PartyStats {
  id: string;
  campaign_id: string;
  stats: Record<string, unknown>;
  updated_at: string;
}

export interface CharacterCampaignStats {
  id: string;
  character_id: string;
  campaign_id: string;
  stats: Record<string, unknown>;
  updated_at: string;
}
