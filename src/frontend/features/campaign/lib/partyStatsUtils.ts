import { supabase } from "@/lib/supabase";

/**
 * Add to one of the campaign's running tallies (crits, fumbles, damage dealt,
 * HP lost/healed, monsters defeated).
 *
 * One atomic server call: increment_party_stat upserts under a row lock, so
 * concurrent rolls no longer lose counts, and any campaign member may call it
 * -- the old client-side read-modify-write was refused by RLS for players, so
 * only the DM's rolls were ever counted.
 */
export async function incrementPartyStat(
  campaignId: string,
  key: string,
  amount: number,
): Promise<void> {
  const { error } = await supabase.rpc("increment_party_stat", {
    p_campaign_id: campaignId,
    p_key: key,
    p_amount: Math.round(amount),
  });
  if (error) console.error("[increment_party_stat]", error.message);
}
