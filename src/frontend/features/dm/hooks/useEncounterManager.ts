import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { finalAbilityScores } from "@/features/characters/types/character.types";
import type { CharacterAbilityScores } from "@/features/characters/types/character.types";
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
  description?: string;
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
  const { campaign, setCampaignEncounter } = useCampaign();
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
          description: npc.description ?? null,
        }))
      );
    }

    await load();
    return encounter as Encounter;
  }

  async function startEncounter(encounterId: string, party: PartyEntry[]) {
    // End any other active or pending encounters for this campaign first
    if (campaign) {
      await supabase
        .from("encounters")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("campaign_id", campaign.id)
        .neq("id", encounterId)
        .in("status", ["active", "pending"]);
    }

    if (party.length > 0) {
      // Snapshot each character's final ability scores onto the participant so
      // initiative (DEX) and stat-based rolls are correct without a separate lookup.
      const charIds = party.map((p) => p.characterId);
      const { data: scoreRows } = await supabase
        .from("ability_scores")
        .select("*")
        .in("character_id", charIds);
      const scoreMap = new Map(
        (scoreRows ?? []).map((s) => [s.character_id as string, s as unknown as CharacterAbilityScores]),
      );
      // Seed the combat snapshot (conditions, defenses, concentration, death saves)
      // from the character sheet onto the participant. The trigger keeps it current.
      const { data: condRows } = await supabase
        .from("characters")
        .select("id, conditions, damage_resistances, damage_immunities, damage_vulnerabilities, concentrating_on, death_save_successes, death_save_failures, exhaustion")
        .in("id", charIds);
      const charMap = new Map(
        (condRows ?? []).map((c) => [c.id as string, c as Record<string, unknown>]),
      );

      await supabase.from("encounter_participants").insert(
        party.map((p, idx) => {
          const s = scoreMap.get(p.characterId);
          const finalScores = s
            ? finalAbilityScores(s, s.background_bonus_primary, s.background_bonus_secondary)
            : null;
          return {
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
            conditions: (charMap.get(p.characterId)?.conditions as string[]) ?? [],
            damage_resistances: (charMap.get(p.characterId)?.damage_resistances as string[]) ?? [],
            damage_immunities: (charMap.get(p.characterId)?.damage_immunities as string[]) ?? [],
            damage_vulnerabilities: (charMap.get(p.characterId)?.damage_vulnerabilities as string[]) ?? [],
            concentrating_on: (charMap.get(p.characterId)?.concentrating_on as string | null) ?? null,
            death_save_successes: (charMap.get(p.characterId)?.death_save_successes as number) ?? 0,
            death_save_failures: (charMap.get(p.characterId)?.death_save_failures as number) ?? 0,
            exhaustion: (charMap.get(p.characterId)?.exhaustion as number) ?? 0,
            str_score: finalScores?.strength ?? null,
            dex_score: finalScores?.dexterity ?? null,
            con_score: finalScores?.constitution ?? null,
            int_score: finalScores?.intelligence ?? null,
            wis_score: finalScores?.wisdom ?? null,
            cha_score: finalScores?.charisma ?? null,
          };
        })
      );
    }

    await supabase
      .from("encounters")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", encounterId);

    // Immediately push the active encounter into CampaignContext so the
    // encounter page sees it right away, without waiting for the realtime event.
    if (campaign) setCampaignEncounter(campaign.id, encounterId);

    await load();
  }

  async function deleteEncounter(encounterId: string) {
    await supabase.from("encounters").delete().eq("id", encounterId);
    setEncounters((prev) => prev.filter((e) => e.id !== encounterId));
  }

  return { encounters, loading, createEncounter, startEncounter, deleteEncounter, reload: load };
}
