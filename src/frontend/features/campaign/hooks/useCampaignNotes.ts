import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import type { CampaignNotes } from "../types/campaign.types";

export function useCampaignNotes() {
  const { campaign } = useCampaign();
  const [notes, setNotes] = useState<CampaignNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!campaign) return;

    async function load() {
      const { data } = await supabase
        .from("campaign_notes")
        .select("*")
        .eq("campaign_id", campaign!.id)
        .maybeSingle();
      setNotes(data as CampaignNotes | null);
      setLoading(false);
    }

    load();
  }, [campaign]);

  async function updateNotes(patch: Partial<Pick<CampaignNotes, "session_notes" | "campaign_details">>) {
    if (!campaign) return;
    setSaving(true);
    const { data } = await supabase
      .from("campaign_notes")
      .upsert(
        { campaign_id: campaign.id, ...patch },
        { onConflict: "campaign_id" }
      )
      .select()
      .single();
    if (data) setNotes(data as CampaignNotes);
    setSaving(false);
  }

  return { notes, loading, saving, updateNotes };
}
