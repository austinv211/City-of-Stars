import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import type { Encounter } from "../types/encounter.types";

export function useActiveEncounter() {
  const { activeEncounterId } = useCampaign();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeEncounterId) {
      setEncounter(null);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("encounters")
        .select("*")
        .eq("id", activeEncounterId)
        .single();
      setEncounter(data as Encounter | null);
      setLoading(false);
    }

    load();
  }, [activeEncounterId]);

  async function endEncounter() {
    if (!activeEncounterId) return;
    await supabase
      .from("encounters")
      .update({ status: "completed" })
      .eq("id", activeEncounterId);
  }

  return { encounter, loading, endEncounter };
}
