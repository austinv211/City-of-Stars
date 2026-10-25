import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { EncounterParticipant } from "../types/encounter.types";
import type { EncounterEvent } from "../lib/events";

const RECENT = 60;

/**
 * The encounter's event log, newest first, live. Rows are written only by
 * database triggers; this hook reads them and offers undo.
 */
export function useEncounterEvents(encounterId: string | null, enabled: boolean) {
  const [events, setEvents] = useState<EncounterEvent[]>([]);
  const active = enabled && !!encounterId;

  useEffect(() => {
    if (!active) return;

    void supabase
      .from("encounter_events")
      .select("*")
      .eq("encounter_id", encounterId)
      .order("id", { ascending: false })
      .limit(RECENT)
      .then(({ data }) => {
        setEvents((data as EncounterEvent[] | null) ?? []);
      });

    const channel = supabase
      .channel(`encounter_events:${encounterId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "encounter_events",
          filter: `encounter_id=eq.${encounterId}`,
        },
        (payload) => {
          const e = payload.new as EncounterEvent;
          // Idempotent on redelivery, newest first, bounded.
          setEvents((prev) =>
            prev.some((x) => x.id === e.id) ? prev : [e, ...prev].slice(0, RECENT),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [active, encounterId]);

  /**
   * Write the event's `before` snapshot back. For a player character the
   * sheet is the source of truth (sync_character_to_participants mirrors it
   * onto the combatant), so it is restored too -- as applyDamage writes both.
   * The undo is itself an ordinary, logged change.
   */
  async function undo(
    patch: Record<string, unknown>,
    participant: EncounterParticipant,
  ) {
    await supabase
      .from("encounter_participants")
      .update(patch)
      .eq("id", participant.id);
    if (participant.character_id) {
      await supabase
        .from("characters")
        .update(patch)
        .eq("id", participant.character_id);
    }
  }

  /**
   * The whole log, oldest first -- for the end-of-encounter summary. Stable
   * per encounter, since callers use it as an effect dependency.
   */
  const fetchAll = useCallback(async (): Promise<EncounterEvent[]> => {
    if (!encounterId) return [];
    const { data } = await supabase
      .from("encounter_events")
      .select("*")
      .eq("encounter_id", encounterId)
      .order("id");
    return (data as EncounterEvent[] | null) ?? [];
  }, [encounterId]);

  return { events: active ? events : [], undo, fetchAll };
}
