import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { incrementPartyStat } from "@/features/campaign/lib/partyStatsUtils";
import type { EncounterParticipant, MonsterAction, MonsterSpecialAbility } from "../types/encounter.types";

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
          if (payload.eventType === "INSERT") {
            setParticipants((prev) =>
              [...prev, normalizeParticipant(payload.new)].sort(
                (a, b) => a.initiative_order - b.initiative_order
              )
            );
          } else if (payload.eventType === "UPDATE") {
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === (payload.new as EncounterParticipant).id
                  ? normalizeParticipant(payload.new)
                  : p
              )
            );
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

  async function updateHP(participantId: string, delta: number) {
    const p = participants.find((x) => x.id === participantId);
    if (!p) return;
    const newHp = Math.max(0, Math.min(p.hp_max, p.hp_current + delta));
    await supabase
      .from("encounter_participants")
      .update({ hp_current: newHp })
      .eq("id", participantId);
    // Sync live HP back to the character sheet for player characters
    if (p.character_id) {
      await supabase
        .from("characters")
        .update({ hp_current: newHp })
        .eq("id", p.character_id);
    }
    // Track HP changes for party stats
    if (campaignId) {
      if (delta < 0) {
        incrementPartyStat(campaignId, "total_hp_lost", Math.abs(delta));
        // Count monster defeat if NPC HP hits 0
        if (!p.is_player && newHp === 0) {
          incrementPartyStat(campaignId, "monsters_defeated", 1);
        }
      } else if (delta > 0) {
        incrementPartyStat(campaignId, "total_hp_healed", delta);
      }
    }
  }

  async function updateConditions(participantId: string, conditions: string[]) {
    await supabase
      .from("encounter_participants")
      .update({ conditions })
      .eq("id", participantId);
  }

  return { participants, loading, updateHP, updateConditions };
}
