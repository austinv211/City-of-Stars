import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import type { Encounter, MonsterAction, MonsterSpecialAbility } from "@/features/encounter/types/encounter.types";

export interface NpcDraft {
  name: string;
  hp: number;
  ac: number;
  initiative: number;
  str_score?: number;
  dex_score?: number;
  con_score?: number;
  int_score?: number;
  wis_score?: number;
  cha_score?: number;
  actions?: MonsterAction[];
  special_abilities?: MonsterSpecialAbility[];
}

export interface PartyEntry {
  characterId: string;
  name: string;
  ownerId: string;
  portraitUrl: string | null;
  hp: number;
  ac: number;
}

export function useEncounterManager() {
  const { campaign } = useCampaign();
  const { user } = useAuth();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!campaign) return;
    const { data } = await supabase
      .from("encounters")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("created_at", { ascending: false });
    setEncounters((data as Encounter[]) ?? []);
    setLoading(false);
  }, [campaign]);

  useEffect(() => {
    if (!campaign) {
      setLoading(false);
      return;
    }
    load();

    const ch = supabase
      .channel(`encounters_dm:${campaign.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "encounters", filter: `campaign_id=eq.${campaign.id}` }, load)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [load]);

  async function createEncounter(name: string, npcs: NpcDraft[]): Promise<Encounter | null> {
    if (!campaign || !user) return null;

    const { data: encounter, error } = await supabase
      .from("encounters")
      .insert({ campaign_id: campaign.id, name, status: "pending", created_by: user.id })
      .select()
      .single();

    if (error || !encounter) return null;

    if (npcs.length > 0) {
      await supabase.from("encounter_participants").insert(
        npcs.map((npc, idx) => ({
          encounter_id: encounter.id,
          name: npc.name,
          hp_current: npc.hp,
          hp_max: npc.hp,
          hp_temp: 0,
          ac: npc.ac,
          initiative_score: npc.initiative,
          initiative_order: idx,
          is_player: false,
          conditions: [],
          str_score: npc.str_score ?? null,
          dex_score: npc.dex_score ?? null,
          con_score: npc.con_score ?? null,
          int_score: npc.int_score ?? null,
          wis_score: npc.wis_score ?? null,
          cha_score: npc.cha_score ?? null,
          actions: npc.actions ?? null,
          special_abilities: npc.special_abilities ?? null,
        }))
      );
    }

    await load();
    return encounter as Encounter;
  }

  async function startEncounter(encounterId: string, party: PartyEntry[]) {
    if (party.length > 0) {
      await supabase.from("encounter_participants").insert(
        party.map((p, idx) => ({
          encounter_id: encounterId,
          character_id: p.characterId,
          name: p.name,
          portrait_url: p.portraitUrl,
          hp_current: p.hp,
          hp_max: p.hp,
          hp_temp: 0,
          ac: p.ac,
          initiative_score: 0,
          initiative_order: 100 + idx,
          is_player: true,
          owner_id: p.ownerId,
          conditions: [],
        }))
      );
    }

    await supabase
      .from("encounters")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", encounterId);

    await load();
  }

  async function deleteEncounter(encounterId: string) {
    await supabase.from("encounters").delete().eq("id", encounterId);
    setEncounters((prev) => prev.filter((e) => e.id !== encounterId));
  }

  return { encounters, loading, createEncounter, startEncounter, deleteEncounter, reload: load };
}
