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

  // Maps an NpcDraft to an encounter_participants insert row (is_player=false).
  function npcInsertRow(encounterId: string, npc: NpcDraft, idx: number) {
    return {
      encounter_id: encounterId,
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
    };
  }

  async function createEncounter(
    name: string,
    npcs: NpcDraft[],
    opts?: { asTemplate?: boolean },
  ): Promise<Encounter | null> {
    if (!campaign || !user) return null;

    const { data: encounter, error } = await supabase
      .from("encounters")
      .insert({
        campaign_id: campaign.id,
        name,
        status: "pending",
        created_by: user.id,
        is_template: opts?.asTemplate ?? false,
      })
      .select()
      .single();

    if (error || !encounter) return null;

    if (npcs.length > 0) {
      await supabase
        .from("encounter_participants")
        .insert(npcs.map((npc, idx) => npcInsertRow(encounter.id, npc, idx)));
    }

    await load();
    return encounter as Encounter;
  }

  // Loads a template's NPC roster back into editable NpcDraft form.
  async function getTemplateNpcs(templateId: string): Promise<NpcDraft[]> {
    const { data } = await supabase
      .from("encounter_participants")
      .select("*")
      .eq("encounter_id", templateId)
      .eq("is_player", false)
      .order("initiative_order", { ascending: true });
    return ((data ?? []) as Record<string, unknown>[]).map((n) => ({
      name: n.name as string,
      hp: (n.hp_max as number) ?? 10,
      ac: (n.ac as number) ?? 12,
      initiative: (n.initiative_score as number) ?? 0,
      str_score: (n.str_score as number) ?? undefined,
      dex_score: (n.dex_score as number) ?? undefined,
      con_score: (n.con_score as number) ?? undefined,
      int_score: (n.int_score as number) ?? undefined,
      wis_score: (n.wis_score as number) ?? undefined,
      cha_score: (n.cha_score as number) ?? undefined,
      actions: (n.actions as MonsterAction[]) ?? undefined,
      special_abilities: (n.special_abilities as MonsterSpecialAbility[]) ?? undefined,
      description: (n.description as string) ?? undefined,
    }));
  }

  // Updates a template's name and replaces its NPC roster.
  async function updateTemplate(templateId: string, name: string, npcs: NpcDraft[]) {
    await supabase.from("encounters").update({ name }).eq("id", templateId);
    await supabase
      .from("encounter_participants")
      .delete()
      .eq("encounter_id", templateId)
      .eq("is_player", false);
    if (npcs.length > 0) {
      await supabase
        .from("encounter_participants")
        .insert(npcs.map((npc, idx) => npcInsertRow(templateId, npc, idx)));
    }
    await load();
  }

  async function startEncounter(encounterId: string, party: PartyEntry[]) {
    // End any other active or pending encounters for this campaign first.
    // Templates (is_template=true) are never started, so leave them untouched.
    if (campaign) {
      await supabase
        .from("encounters")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("campaign_id", campaign.id)
        .eq("is_template", false)
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

  // Clones a template into a fresh encounter and starts it. The template's NPC
  // roster is copied (HP reset to max, transient state cleared) and the chosen
  // party is added via the normal start flow. Returns the new run's id.
  async function runTemplate(template: Encounter, party: PartyEntry[]): Promise<string | null> {
    if (!campaign || !user) return null;

    const { data: run, error } = await supabase
      .from("encounters")
      .insert({
        campaign_id: campaign.id,
        name: template.name,
        status: "pending",
        created_by: user.id,
        is_template: false,
      })
      .select()
      .single();

    if (error || !run) return null;

    const { data: npcRows } = await supabase
      .from("encounter_participants")
      .select("*")
      .eq("encounter_id", template.id)
      .eq("is_player", false)
      .order("initiative_order", { ascending: true });

    if (npcRows && npcRows.length > 0) {
      await supabase.from("encounter_participants").insert(
        (npcRows as Record<string, unknown>[]).map((n, idx) => ({
          encounter_id: run.id,
          name: n.name as string,
          hp_current: (n.hp_max as number) ?? 10,
          hp_max: (n.hp_max as number) ?? 10,
          hp_temp: 0,
          ac: (n.ac as number) ?? 12,
          initiative_score: (n.initiative_score as number) ?? 0,
          initiative_order: idx,
          is_player: false,
          conditions: [],
          str_score: (n.str_score as number) ?? null,
          dex_score: (n.dex_score as number) ?? null,
          con_score: (n.con_score as number) ?? null,
          int_score: (n.int_score as number) ?? null,
          wis_score: (n.wis_score as number) ?? null,
          cha_score: (n.cha_score as number) ?? null,
          actions: (n.actions as unknown) ?? null,
          special_abilities: (n.special_abilities as unknown) ?? null,
          description: (n.description as string) ?? null,
        })),
      );
    }

    await startEncounter(run.id, party);
    return run.id;
  }

  async function deleteEncounter(encounterId: string) {
    await supabase.from("encounters").delete().eq("id", encounterId);
    setEncounters((prev) => prev.filter((e) => e.id !== encounterId));
  }

  return {
    encounters,
    loading,
    createEncounter,
    updateTemplate,
    getTemplateNpcs,
    startEncounter,
    runTemplate,
    deleteEncounter,
    reload: load,
  };
}
