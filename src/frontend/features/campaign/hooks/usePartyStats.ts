import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import type { PartyStats, CharacterCampaignStats } from "../types/campaign.types";

export function usePartyStats() {
  const { campaign } = useCampaign();
  const [partyStats, setPartyStats] = useState<PartyStats | null>(null);
  const [characterStats, setCharacterStats] = useState<CharacterCampaignStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaign) return;

    async function load() {
      const [{ data: party }, { data: chars }] = await Promise.all([
        supabase.from("party_stats").select("*").eq("campaign_id", campaign!.id).maybeSingle(),
        supabase.from("character_campaign_stats").select("*").eq("campaign_id", campaign!.id),
      ]);
      setPartyStats(party as PartyStats | null);
      setCharacterStats((chars as CharacterCampaignStats[]) ?? []);
      setLoading(false);
    }

    load();
  }, [campaign]);

  return { partyStats, characterStats, loading };
}
