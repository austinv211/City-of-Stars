import { supabase } from "@/lib/supabase";

export async function incrementPartyStat(
  campaignId: string,
  key: string,
  amount: number
): Promise<void> {
  const { data } = await supabase
    .from("party_stats")
    .select("id, stats")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const current = (data?.stats as Record<string, number> | null) ?? {};
  const updated = { ...current, [key]: (current[key] ?? 0) + amount };

  if (data) {
    await supabase
      .from("party_stats")
      .update({ stats: updated })
      .eq("id", data.id);
  } else {
    await supabase
      .from("party_stats")
      .insert({ campaign_id: campaignId, stats: updated, void_alignment: 0 });
  }
}
