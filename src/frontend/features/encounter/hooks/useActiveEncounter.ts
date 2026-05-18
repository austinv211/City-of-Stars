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

    const channel = supabase
      .channel(`encounter:${activeEncounterId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "encounters",
          filter: `id=eq.${activeEncounterId}`,
        },
        (payload) => {
          setEncounter((prev) =>
            prev ? { ...prev, ...(payload.new as Encounter) } : (payload.new as Encounter)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeEncounterId]);

  async function endEncounter() {
    if (!activeEncounterId) return;
    await supabase
      .from("encounters")
      .update({ status: "completed" })
      .eq("id", activeEncounterId);
  }

  async function advanceTurn() {
    if (!activeEncounterId) return;
    await supabase.rpc("advance_encounter_turn", { p_encounter_id: activeEncounterId });
  }

  return { encounter, loading, endEncounter, advanceTurn };
}
