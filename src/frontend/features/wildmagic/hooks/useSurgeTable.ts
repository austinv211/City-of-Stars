import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SurgeDraft, SurgeEntry } from "../lib/surgeTable";

type Result = Promise<{ error?: string }>;

async function fetchTable(campaignId: string): Promise<SurgeEntry[]> {
  const { data, error } = await supabase
    .from("wild_magic_surges")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("roll_min", { ascending: true, nullsFirst: false })
    .order("name");
  if (error) console.error("[wild magic] load failed:", error.message);
  return (data ?? []) as SurgeEntry[];
}

/** The campaign's surge table, with the DM's edits applied as they happen. */
export function useSurgeTable(campaignId: string | undefined) {
  const [table, setTable] = useState<{ campaignId?: string; entries: SurgeEntry[] }>({ entries: [] });

  const reload = useCallback(async () => {
    if (!campaignId) return;
    setTable({ campaignId, entries: await fetchTable(campaignId) });
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    void fetchTable(campaignId).then((entries) => {
      if (!cancelled) setTable({ campaignId, entries });
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const run = useCallback(
    async (op: PromiseLike<{ error: { message: string } | null }>): Result => {
      const { error } = await op;
      if (error) return { error: error.message };
      await reload();
      return {};
    },
    [reload],
  );

  return {
    entries: table.entries,
    loading: !!campaignId && table.campaignId !== campaignId,
    add: (drafts: SurgeDraft[]) =>
      run(supabase.from("wild_magic_surges").insert(drafts.map((d) => ({ ...d, campaign_id: campaignId })))),
    update: (id: string, draft: SurgeDraft) => run(supabase.from("wild_magic_surges").update(draft).eq("id", id)),
    remove: (id: string) => run(supabase.from("wild_magic_surges").delete().eq("id", id)),
  };
}
