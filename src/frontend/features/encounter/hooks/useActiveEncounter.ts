import { useEffect, useState } from "react";
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import type { Encounter } from "../types/encounter.types";

export function useActiveEncounter() {
  const { activeEncounterId } = useCampaign();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeEncounterId) {
      setEncounter(null);
      setLoading(false);
      return;
    }

    async function load(background = false) {
      // A resync must not flash the screen back to its loading state.
      if (!background) setLoading(true);
      const { data } = await supabase
        .from("encounters")
        .select("*")
        .eq("id", activeEncounterId)
        .maybeSingle();
      setEncounter(data as Encounter | null);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`encounter:${activeEncounterId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "encounters",
          filter: `id=eq.${activeEncounterId}`,
        },
        (payload) => {
          setEncounter((prev) =>
            prev ? { ...prev, ...(payload.new as Encounter) } : (payload.new as Encounter)
          );
        }
      )
      // Load again once joined: a change made between the first load and the
      // join is never delivered, and a turn advanced in that gap would
      // show the wrong combatant acting. Also resyncs after a reconnect.
      .subscribe((status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) void load(true);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeEncounterId]);

  async function endEncounter() {
    if (!activeEncounterId) return;
    await supabase
      .from("encounters")
      .update({ status: "completed" })
      .eq("id", activeEncounterId);
  }

  async function advanceTurn() {
    if (!activeEncounterId) return;
    await supabase.rpc("advance_encounter_turn", { p_encounter_id: activeEncounterId });
    // The server picks who is next, so this cannot be optimistic -- but the
    // one who ended the turn should see it move now, not when the realtime
    // echo arrives (under load, seconds later). The echo is idempotent.
    const fresh = await supabase
      .from("encounters")
      .select("*")
      .eq("id", activeEncounterId)
      .maybeSingle();
    if (fresh.data) setEncounter(fresh.data as Encounter);
  }

  /** The initiative count lair actions act on (conventionally 20); null = no lair. */
  async function setLairInitiative(value: number | null) {
    if (!activeEncounterId) return;
    // Optimistic: a toggle that waits for the realtime round-trip looks broken.
    setEncounter((prev) => (prev ? { ...prev, lair_action_initiative: value } : prev));
    await supabase
      .from("encounters")
      .update({ lair_action_initiative: value })
      .eq("id", activeEncounterId);
  }

  return { encounter, loading, endEncounter, advanceTurn, setLairInitiative };
}
