import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { incrementPartyStat } from "../lib/partyStatsUtils";
import type { PartyStats, CharacterCampaignStats } from "../types/campaign.types";

export function usePartyStats() {
  const { campaign } = useCampaign();
  const [partyStats, setPartyStats] = useState<PartyStats | null>(null);
  const [characterStats, setCharacterStats] = useState<CharacterCampaignStats[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!campaign) return;
    const [{ data: party }, { data: chars }] = await Promise.all([
      supabase.from("party_stats").select("*").eq("campaign_id", campaign.id).maybeSingle(),
      supabase.from("character_campaign_stats").select("*").eq("campaign_id", campaign.id),
    ]);
    setPartyStats(party as PartyStats | null);
    setCharacterStats((chars as CharacterCampaignStats[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!campaign) return;
    load();
  }, [campaign?.id]);

  const updateVoidAlignment = useCallback(async (value: number) => {
    if (!campaign) return;
    const clamped = Math.max(0, Math.min(10, value));
    if (partyStats) {
      await supabase
        .from("party_stats")
        .update({ void_alignment: clamped })
        .eq("id", partyStats.id);
    } else {
      await supabase.from("party_stats").insert({
        campaign_id: campaign.id,
        void_alignment: clamped,
        stats: {},
      });
    }
    await load();
  }, [campaign, partyStats]);

  const incrementStat = useCallback(async (key: string, amount: number) => {
    if (!campaign) return;
    await incrementPartyStat(campaign.id, key, amount);
    await load();
  }, [campaign]);

  return { partyStats, characterStats, loading, updateVoidAlignment, incrementStat, reload: load };
}
