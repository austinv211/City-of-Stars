import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { incrementPartyStat } from "@/features/campaign/lib/partyStatsUtils";
import { applyDamageMitigation, concentrationDC, resolveDeathSave } from "@/features/characters/data/rules2024";
import type { EncounterParticipant, MonsterAction, MonsterSpecialAbility } from "../types/encounter.types";

export interface DamageResult {
  dealt: number;
  concentrationDC: number | null;
  dropped: boolean;
  instantDeath: boolean;
}

function parseJsonArray<T>(val: unknown): T[] | null {
  if (val === null || val === undefined) return null;
  if (Array.isArray(val)) return val as T[];
  if (typeof val === "string") {
    try { return JSON.parse(val) as T[]; } catch { return null; }
  }
  return null;
}

function normalizeParticipant(raw: unknown): EncounterParticipant {
  const p = raw as EncounterParticipant;
  return {
    ...p,
    actions: parseJsonArray<MonsterAction>(p.actions),
    special_abilities: parseJsonArray<MonsterSpecialAbility>(p.special_abilities),
  };
}

export function useEncounterParticipants(encounterId: string | null, campaignId?: string) {
  const [participants, setParticipants] = useState<EncounterParticipant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!encounterId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    async function load() {
      const { data } = await supabase
        .from("encounter_participants")
        .select("*")
        .eq("encounter_id", encounterId)
        .order("initiative_order", { ascending: true });
      setParticipants((data ?? []).map(normalizeParticipant));
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`encounter_participants:${encounterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "encounter_participants",
          filter: `encounter_id=eq.${encounterId}`,
        },
        (payload) => {
          // All handlers merge by id so the realtime stream stays idempotent —
          // a load()/INSERT race or a re-delivered event can never duplicate a row.
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const incoming = normalizeParticipant(payload.new);
            setParticipants((prev) => {
              const exists = prev.some((p) => p.id === incoming.id);
              const next = exists
                ? prev.map((p) => (p.id === incoming.id ? incoming : p))
                : [...prev, incoming];
              return next.sort((a, b) => a.initiative_order - b.initiative_order);
            });
          } else if (payload.eventType === "DELETE") {
            setParticipants((prev) =>
              prev.filter((p) => p.id !== (payload.old as EncounterParticipant).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [encounterId]);

  // Apply typed damage with 2024 rules: resistance/immunity/vulnerability, temp HP
  // absorbed first, then HP; death-save automation for downed players; returns the
  // dealt amount and whether a concentration save is required.
  async function applyDamage(
    participantId: string,
    rawAmount: number,
    type: string | null = null,
    opts: { crit?: boolean } = {},
  ): Promise<DamageResult> {
    const p = participants.find((x) => x.id === participantId);
    if (!p || rawAmount <= 0) return { dealt: 0, concentrationDC: null, dropped: false, instantDeath: false };

    const dealt = applyDamageMitigation(p, type, rawAmount);

    // Temporary HP soaks damage first.
    let remaining = dealt;
    let newTemp = p.hp_temp ?? 0;
    const absorbed = Math.min(newTemp, remaining);
    newTemp -= absorbed;
    remaining -= absorbed;

    const wasAtZero = p.hp_current <= 0;
    const newHp = Math.max(0, p.hp_current - remaining);

    // Death-save automation (players only).
    let newFailures = p.death_save_failures;
    let instantDeath = false;
    if (p.is_player) {
      const overflow = remaining - Math.max(0, p.hp_current);
      if (newHp === 0 && p.hp_max > 0 && overflow >= p.hp_max) {
        instantDeath = true;
        newFailures = 3;
      } else if (wasAtZero && dealt > 0) {
        newFailures = Math.min(3, p.death_save_failures + (opts.crit ? 2 : 1));
      }
    }

    const epUpdate: Record<string, unknown> = { hp_current: newHp, hp_temp: newTemp };
    if (newFailures !== p.death_save_failures) epUpdate.death_save_failures = newFailures;
    await supabase.from("encounter_participants").update(epUpdate).eq("id", participantId);

    if (p.character_id) {
      const charUpdate: Record<string, unknown> = { hp_current: newHp, hp_temp: newTemp };
      if (newFailures !== p.death_save_failures) charUpdate.death_save_failures = newFailures;
      await supabase.from("characters").update(charUpdate).eq("id", p.character_id);
    }

    if (campaignId) {
      incrementPartyStat(campaignId, "total_hp_lost", dealt);
      if (!p.is_player && newHp === 0) incrementPartyStat(campaignId, "monsters_defeated", 1);
    }

    const conc = p.is_player && p.concentrating_on && dealt > 0 ? concentrationDC(dealt) : null;
    return { dealt, concentrationDC: conc, dropped: newHp === 0, instantDeath };
  }

  async function applyHealing(participantId: string, amount: number) {
    const p = participants.find((x) => x.id === participantId);
    if (!p || amount <= 0) return;
    const wasAtZero = p.hp_current <= 0;
    const newHp = Math.min(p.hp_max, p.hp_current + amount);
    const revived = wasAtZero && newHp > 0;
    const epUpdate: Record<string, unknown> = { hp_current: newHp };
    if (revived) { epUpdate.death_save_successes = 0; epUpdate.death_save_failures = 0; }
    await supabase.from("encounter_participants").update(epUpdate).eq("id", participantId);
    if (p.character_id) {
      await supabase.from("characters").update(epUpdate).eq("id", p.character_id);
    }
    if (campaignId) incrementPartyStat(campaignId, "total_hp_healed", amount);
  }

  // Raw ± adjust (DM override): routes through the typed flow without a damage type.
  async function updateHP(participantId: string, delta: number) {
    if (delta < 0) await applyDamage(participantId, -delta, null);
    else if (delta > 0) await applyHealing(participantId, delta);
  }

  async function setDeathSaves(participantId: string, successes: number, failures: number) {
    const p = participants.find((x) => x.id === participantId);
    const update = { death_save_successes: successes, death_save_failures: failures };
    await supabase.from("encounter_participants").update(update).eq("id", participantId);
    if (p?.character_id) await supabase.from("characters").update(update).eq("id", p.character_id);
  }

  // Resolve a rolled death save (nat 20 → 1 HP, nat 1 → 2 failures, 10+ success).
  async function applyDeathSaveRoll(participantId: string, d20: number) {
    const p = participants.find((x) => x.id === participantId);
    if (!p) return;
    const r = resolveDeathSave(d20);
    let successes = p.death_save_successes;
    let failures = p.death_save_failures;
    let hp = p.hp_current;
    if (r.regainsConsciousness) { successes = 0; failures = 0; hp = Math.max(1, hp); }
    else {
      successes = Math.min(3, successes + r.successesDelta);
      failures = Math.min(3, failures + r.failuresDelta);
    }
    const update = { death_save_successes: successes, death_save_failures: failures, hp_current: hp };
    await supabase.from("encounter_participants").update(update).eq("id", participantId);
    if (p.character_id) await supabase.from("characters").update(update).eq("id", p.character_id);
  }

  async function setConcentration(participantId: string, spell: string | null) {
    const p = participants.find((x) => x.id === participantId);
    await supabase.from("encounter_participants").update({ concentrating_on: spell }).eq("id", participantId);
    if (p?.character_id) await supabase.from("characters").update({ concentrating_on: spell }).eq("id", p.character_id);
  }

  // Cover is transient combat state — participant only, never written to the character.
  async function setCover(participantId: string, cover: string) {
    await supabase.from("encounter_participants").update({ cover }).eq("id", participantId);
  }

  // Per-turn action economy flags — all participant-only, reset by the turn-
  // advance RPC. Dodge piggybacks on the same lifetime (cleared on turn start).
  async function setTurnFlag(
    participantId: string,
    flag: "action_used" | "bonus_used" | "reaction_used" | "dodging",
    value: boolean,
  ) {
    await supabase
      .from("encounter_participants")
      .update({ [flag]: value })
      .eq("id", participantId);
  }

  async function setHeroicInspiration(participantId: string, value: boolean) {
    const p = participants.find((x) => x.id === participantId);
    await supabase.from("encounter_participants").update({ heroic_inspiration: value }).eq("id", participantId);
    if (p?.character_id) await supabase.from("characters").update({ heroic_inspiration: value }).eq("id", p.character_id);
  }

  async function updateConditions(participantId: string, conditions: string[]) {
    const p = participants.find((x) => x.id === participantId);
    // Update the participant immediately for snappy UI.
    await supabase
      .from("encounter_participants")
      .update({ conditions })
      .eq("id", participantId);
    // For player characters, conditions live on the character sheet (the
    // persistent source of truth); the DB trigger mirrors them back to every
    // active participant. NPCs have no character, so the participant is authoritative.
    if (p?.character_id) {
      await supabase
        .from("characters")
        .update({ conditions })
        .eq("id", p.character_id);
    }
  }

  return {
    participants, loading, updateHP, updateConditions,
    applyDamage, applyHealing, setDeathSaves, applyDeathSaveRoll, setConcentration, setCover,
    setHeroicInspiration, setTurnFlag,
  };
}
