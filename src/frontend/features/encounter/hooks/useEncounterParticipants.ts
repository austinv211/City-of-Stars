import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { EncounterParticipant } from "../types/encounter.types";

export function useEncounterParticipants(encounterId: string | null) {
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
      setParticipants((data as EncounterParticipant[]) ?? []);
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
              [...prev, payload.new as EncounterParticipant].sort(
                (a, b) => a.initiative_order - b.initiative_order
              )
            );
          } else if (payload.eventType === "UPDATE") {
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === (payload.new as EncounterParticipant).id
                  ? (payload.new as EncounterParticipant)
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
  }

  async function updateConditions(participantId: string, conditions: string[]) {
    await supabase
      .from("encounter_participants")
      .update({ conditions })
      .eq("id", participantId);
  }

  return { participants, loading, updateHP, updateConditions };
}
