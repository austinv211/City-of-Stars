import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** A wild magic surge that happened to a character (public.character_surges). */
export interface CharacterSurge {
  id: string;
  campaign_id: string;
  character_id: string;
  surge_id: string | null;
  roll: number | null;
  name: string;
  description: string | null;
  effect_id: string | null;
  created_at: string;
  ended_at: string | null;
}

async function fetchActive(characterId: string): Promise<CharacterSurge[]> {
  const { data, error } = await supabase
    .from("character_surges")
    .select("*")
    .eq("character_id", characterId)
    .is("ended_at", null)
    .order("created_at", { ascending: false });
  if (error) console.error("[surges] load failed:", error.message);
  return (data ?? []) as CharacterSurge[];
}

/** The surges still affecting one character, kept live. */
export function useActiveSurges(characterId: string | undefined) {
  const [surges, setSurges] = useState<CharacterSurge[]>([]);

  const refresh = useCallback(() => {
    if (!characterId) return;
    void fetchActive(characterId).then(setSurges);
  }, [characterId]);

  useEffect(() => {
    if (!characterId) return;
    let cancelled = false;
    const apply = (rows: CharacterSurge[]) => {
      if (!cancelled) setSurges(rows);
    };
    void fetchActive(characterId).then(apply);
    const channel = supabase
      .channel(`character-surges:${characterId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "character_surges", filter: `character_id=eq.${characterId}` },
        () => void fetchActive(characterId).then(apply),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [characterId]);

  return { surges: characterId ? surges : [], refresh };
}

export async function endSurge(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("end_wild_magic_surge", { p_id: id });
  return error ? { error: error.message } : {};
}

/** Calls `onSurge` for every surge applied in this campaign from now on. */
export function useSurgeFeed(campaignId: string | undefined, onSurge: (surge: CharacterSurge) => void) {
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`surge-feed:${campaignId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "character_surges", filter: `campaign_id=eq.${campaignId}` },
        (payload) => onSurge(payload.new as CharacterSurge),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [campaignId, onSurge]);
}

/** A character's name and owner, for announcing a surge. */
export async function fetchCharacterBrief(characterId: string): Promise<{ name: string; owner_id: string } | null> {
  const result = await supabase.from("characters").select("name, owner_id").eq("id", characterId).maybeSingle();
  return result.data;
}
