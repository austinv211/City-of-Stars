import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CharacterWithScores } from "../types/character.types";

export function useCharacter(characterId: string | undefined) {
  const [character, setCharacter] = useState<CharacterWithScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!characterId) return;

    async function load() {
      const { data, error } = await supabase
        .from("characters")
        .select("*, ability_scores(*), proficiencies:character_proficiencies(*)")
        .eq("id", characterId)
        .single();

      if (error) setError(error.message);
      else setCharacter(data as CharacterWithScores);
      setLoading(false);
    }

    load();

    // React to level-ups from the DM
    const channel = supabase
      .channel(`character:${characterId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "characters", filter: `id=eq.${characterId}` },
        (payload) => {
          setCharacter((prev) =>
            prev ? { ...prev, ...(payload.new as CharacterWithScores) } : null
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [characterId]);

  return { character, loading, error };
}
