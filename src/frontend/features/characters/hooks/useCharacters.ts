import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import type { Character } from "../types/character.types";

export function useCharacters() {
  const { campaign, loading: campaignLoading } = useCampaign();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaignLoading) return;
    if (!campaign) {
      setLoading(false);
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("campaign_id", campaign!.id)
        .order("created_at", { ascending: true });

      if (error) setError(error.message);
      else setCharacters(data as Character[]);
      setLoading(false);
    }

    load();

    // Listen for level-ups and status changes
    const channel = supabase
      .channel(`characters:${campaign.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "characters", filter: `campaign_id=eq.${campaign.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCharacters((prev) => [...prev, payload.new as Character]);
          } else if (payload.eventType === "UPDATE") {
            setCharacters((prev) =>
              prev.map((c) => (c.id === (payload.new as Character).id ? (payload.new as Character) : c))
            );
          } else if (payload.eventType === "DELETE") {
            setCharacters((prev) => prev.filter((c) => c.id !== (payload.old as Character).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign?.id, campaignLoading]);

  return { characters, loading, error };
}
