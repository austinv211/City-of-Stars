import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { EffectExpiry, EncounterEffect } from "../types/encounter.types";

export interface NewEffect {
  targetParticipantId: string;
  sourceParticipantId: string | null;
  name: string;
  description?: string;
  expiry: EffectExpiry;
  roundsRemaining?: number;
}

/**
 * Tracked effects in one encounter, live.
 *
 * Expiry happens server-side (advance_encounter_turn ticks them; dropping
 * concentration ends them at once), so this hook only mirrors the table.
 *
 * The "Bless ended" toast reads the name from this hook's own state, not from
 * the DELETE event: with RLS enabled, Realtime sends only the primary key of
 * a deleted row, whatever the table's replica identity.
 */
export function useEncounterEffects(encounterId: string | null) {
  const [effects, setEffects] = useState<EncounterEffect[]>([]);
  // Read by the realtime handler, which outlives any single render.
  const known = useRef(effects);
  useEffect(() => {
    known.current = effects;
  }, [effects]);

  useEffect(() => {
    if (!encounterId) return;

    void supabase
      .from("encounter_effects")
      .select("*")
      .eq("encounter_id", encounterId)
      .order("created_at")
      .then(({ data }) => {
        setEffects((data as EncounterEffect[] | null) ?? []);
      });

    const channel = supabase
      .channel(`encounter_effects:${encounterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "encounter_effects",
          filter: `encounter_id=eq.${encounterId}`,
        },
        (payload) => {
          // Merge by id, like useEncounterParticipants, so a load/INSERT race
          // or a re-delivered event can never duplicate a row.
          if (payload.eventType === "DELETE") {
            const goneId = (payload.old as Partial<EncounterEffect>).id;
            const gone = known.current.find((e) => e.id === goneId);
            setEffects((prev) => prev.filter((e) => e.id !== goneId));
            if (gone) toast(`${gone.name} ended`);
            return;
          }
          const incoming = payload.new as EncounterEffect;
          setEffects((prev) =>
            prev.some((e) => e.id === incoming.id)
              ? prev.map((e) => (e.id === incoming.id ? incoming : e))
              : [...prev, incoming],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [encounterId]);

  async function addEffect(e: NewEffect): Promise<string | null> {
    if (!encounterId) return null;
    const { error } = await supabase.from("encounter_effects").insert({
      encounter_id: encounterId,
      target_participant_id: e.targetParticipantId,
      source_participant_id: e.sourceParticipantId,
      name: e.name.trim(),
      description: e.description?.trim() ? e.description.trim() : null,
      expiry: e.expiry,
      rounds_remaining: e.expiry === "rounds" ? (e.roundsRemaining ?? 1) : null,
    });
    return error ? error.message : null;
  }

  async function removeEffect(id: string) {
    await supabase.from("encounter_effects").delete().eq("id", id);
  }

  // Derived rather than reset inside the effect: with no encounter there are
  // simply no effects, whatever the last one left in state.
  return { effects: encounterId ? effects : [], addEffect, removeEffect };
}
