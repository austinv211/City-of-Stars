import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CharacterWithScores } from "../types/character.types";

export function useCharacter(characterId: string | undefined) {
  // useId gives each hook instance a unique suffix so multiple callers with the
  // same characterId don't create duplicate Supabase channel names.
  const instanceId = useId();
  const [character, setCharacter] = useState<CharacterWithScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!characterId) return;
    const { data, error } = await supabase
      .from("characters")
      .select("*, ability_scores(*), proficiencies:character_proficiencies(*)")
      .eq("id", characterId)
      .maybeSingle();

    if (error) setError(error.message);
    else setCharacter(data as CharacterWithScores);
    setLoading(false);
  }, [characterId]);

  useEffect(() => {
    if (!characterId) {
      setLoading(false);
      return;
    }

    load();

    // React to level-ups from the DM
    const channel = supabase
      .channel(`character:${characterId}:${instanceId}`)
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
  }, [characterId, load]);

  return { character, loading, error, reload: load };
}
