import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CharacterSurge } from "@/core/hooks/useCharacterSurges";

export interface SurgeTarget {
  id: string;
  name: string;
}

const LOG_LIMIT = 30;

async function fetchLog(campaignId: string) {
  const [log, characters] = await Promise.all([
    supabase
      .from("character_surges")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(LOG_LIMIT),
    supabase
      .from("characters")
      .select("id, name")
      .eq("campaign_id", campaignId)
      .eq("status", "active")
      .order("name"),
  ]);
  return {
    log: (log.data ?? []) as CharacterSurge[],
    targets: (characters.data ?? []) as SurgeTarget[],
  };
}

/** Recent surges in the campaign and the characters one can land on. */
export function useSurgeLog(campaignId: string | undefined) {
  const [state, setState] = useState<{ log: CharacterSurge[]; targets: SurgeTarget[] }>({ log: [], targets: [] });

  const reload = useCallback(() => {
    if (!campaignId) return;
    void fetchLog(campaignId).then(setState);
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    const apply = (next: Awaited<ReturnType<typeof fetchLog>>) => {
      if (!cancelled) setState(next);
    };
    void fetchLog(campaignId).then(apply);
    const channel = supabase
      .channel(`surge-log:${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "character_surges", filter: `campaign_id=eq.${campaignId}` },
        () => void fetchLog(campaignId).then(apply),
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [campaignId]);

  return { ...state, reload };
}

/**
 * Applies a surge: a specific entry, or a d100 roll looked up on the table
 * (rolled on the server when `roll` is omitted).
 */
export async function applySurge(
  characterId: string,
  pick: { surgeId: string } | { roll?: number },
): Promise<{ surge?: CharacterSurge; error?: string }> {
  const result = await supabase.rpc("apply_wild_magic_surge", {
    p_character_id: characterId,
    p_surge_id: "surgeId" in pick ? pick.surgeId : null,
    p_roll: "roll" in pick ? (pick.roll ?? null) : null,
  });
  return result.error ? { error: result.error.message } : { surge: result.data as CharacterSurge };
}
