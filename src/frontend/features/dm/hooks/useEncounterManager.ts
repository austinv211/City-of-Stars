import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import type { CharacterAbilityScores } from "@/features/characters/types/character.types";
import { NO_SNAPSHOT, SNAPSHOT_COLUMNS, scoreColumns, type CombatSnapshot } from "../lib/participantRows";
import type { Encounter, MonsterAction, MonsterSpecialAbility } from "@/features/encounter/types/encounter.types";
import type { Database } from "@/types/database";

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
  legendary_actions?: MonsterSpecialAbility[];
  damage_resistances?: string[];
  damage_immunities?: string[];
  damage_vulnerabilities?: string[];
  description?: string;
  /** Shown to players instead of `name`. */
  nickname?: string;
  portrait_url?: string;
}

/** The 2024 default: three legendary actions per round, for any creature that has them. */
const LEGENDARY_ACTIONS_PER_ROUND = 3;

type ParticipantRow = Database["public"]["Tables"]["encounter_participants"]["Row"];

/** A row's null is a draft's absent field, and a draft's absent field is a row's null. */
const absent = <T>(v: T | null): T | undefined => v ?? undefined;
const nullable = <T>(v: T | undefined): T | null => v ?? null;

/**
 * An NPC encounter_participants row back into draft form. The single reverse
 * mapping, used both to edit a template and to run one -- runTemplate used to
 * hand-copy its own subset of columns and silently dropped resistances,
 * immunities and vulnerabilities.
 */
function rowToNpc(n: ParticipantRow): NpcDraft {
  return {
    name: n.name,
    hp: n.hp_max,
    ac: n.ac,
    initiative: n.initiative_score,
    str_score: absent(n.str_score),
    dex_score: absent(n.dex_score),
    con_score: absent(n.con_score),
    int_score: absent(n.int_score),
    wis_score: absent(n.wis_score),
    cha_score: absent(n.cha_score),
    actions: absent(n.actions) as MonsterAction[] | undefined,
    special_abilities: absent(n.special_abilities) as MonsterSpecialAbility[] | undefined,
    legendary_actions: absent(n.legendary_actions) as MonsterSpecialAbility[] | undefined,
    damage_resistances: n.damage_resistances,
    damage_immunities: n.damage_immunities,
    damage_vulnerabilities: n.damage_vulnerabilities,
    description: absent(n.description),
    nickname: absent(n.nickname),
    portrait_url: absent(n.portrait_url),
  };
}

export interface PartyEntry {
  characterId: string;
  name: string;
  ownerId: string;
  portraitUrl: string | null;
  /** HP entering the fight, already clamped to hpMax. */
  hp: number;
  /** The sheet's max: the participant's max, not the starting HP. */
  hpMax: number;
  hpTemp: number;
  /** The sheet's current HP, to tell whether the DM changed it. */
  sheetHp: number | null;
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
    const legendaryBudget = npc.legendary_actions?.length ? LEGENDARY_ACTIONS_PER_ROUND : 0;
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
      str_score: nullable(npc.str_score),
      dex_score: nullable(npc.dex_score),
      con_score: nullable(npc.con_score),
      int_score: nullable(npc.int_score),
      wis_score: nullable(npc.wis_score),
      cha_score: nullable(npc.cha_score),
      actions: nullable(npc.actions),
      special_abilities: nullable(npc.special_abilities),
      legendary_actions: npc.legendary_actions?.length ? npc.legendary_actions : null,
      legendary_actions_max: legendaryBudget,
      legendary_actions_remaining: legendaryBudget,
      damage_resistances: npc.damage_resistances ?? [],
      damage_immunities: npc.damage_immunities ?? [],
      damage_vulnerabilities: npc.damage_vulnerabilities ?? [],
      description: nullable(npc.description),
      nickname: nullable(npc.nickname),
      portrait_url: nullable(npc.portrait_url),
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
    return ((data ?? []) as ParticipantRow[]).map(rowToNpc);
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
        .select(`id, ${SNAPSHOT_COLUMNS.join(", ")}`)
        .in("id", charIds);
      const charMap = new Map(
        ((condRows ?? []) as unknown as ({ id: string } & CombatSnapshot)[]).map(({ id, ...snap }) => [id, snap]),
      );

      await supabase.from("encounter_participants").insert(
        party.map((p, idx) => ({
          encounter_id: encounterId,
          character_id: p.characterId,
          name: p.name,
          portrait_url: p.portraitUrl,
          hp_current: p.hp,
          hp_max: p.hpMax,
          hp_temp: p.hpTemp,
          ac: p.ac,
          initiative_score: 0,
          initiative_order: 100 + idx,
          is_player: true,
          owner_id: p.ownerId,
          ...(charMap.get(p.characterId) ?? NO_SNAPSHOT),
          ...scoreColumns(scoreMap.get(p.characterId)),
        })),
      );
    }

    // A starting HP the DM changed goes onto the sheet too; otherwise the sync
    // trigger would copy the old value back over it on the next HP change.
    await Promise.all(
      party
        .filter((p) => p.hp !== p.sheetHp)
        .map((p) => supabase.from("characters").update({ hp_current: p.hp }).eq("id", p.characterId)),
    );

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
        (npcRows as ParticipantRow[]).map((n, idx) =>
          npcInsertRow(run.id, rowToNpc(n), idx),
        ),
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
