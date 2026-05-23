import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CharacterSpellSlot } from "../types/character.types";
import { slotsForClass } from "../data/spellSlots";

export { slotsForClass } from "../data/spellSlots";

export function useSpellSlots(characterId: string, characterClass: string, level: number, subclass?: string | null) {
  const [slots, setSlots] = useState<CharacterSpellSlot[]>([]);
  const [loading, setLoading] = useState(true);
  // Unique per hook instance so two panels subscribing for the same character
  // (e.g. the encounter action panel + the character quick-ref) don't collide
  // on a shared Realtime channel topic.
  const instanceId = useId();

  const computedTotals = slotsForClass(characterClass, level, subclass);

  const load = useCallback(async () => {
    // No character (e.g. an NPC encounter participant): nothing to load.
    if (!characterId) {
      setSlots([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("character_spell_slots")
      .select("*")
      .eq("character_id", characterId)
      .order("spell_level", { ascending: true });

    if (data && data.length > 0) {
      setSlots(data as CharacterSpellSlot[]);
    } else {
      // Auto-initialize slots from SRD table
      const rows = computedTotals
        .map((total, i) => ({ character_id: characterId, spell_level: i + 1, slots_total: total, slots_expended: 0 }))
        .filter((r) => r.slots_total > 0);

      if (rows.length > 0) {
        await supabase.from("character_spell_slots").upsert(rows, { onConflict: "character_id,spell_level" });
        setSlots(rows.map((r) => ({ id: "", ...r })));
      } else {
        setSlots([]);
      }
    }
    setLoading(false);
  }, [characterId]);

  useEffect(() => {
    load();

    if (!characterId) return;

    const ch = supabase
      .channel(`spell_slots:${characterId}:${instanceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "character_spell_slots", filter: `character_id=eq.${characterId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setSlots((prev) =>
              prev.map((s) =>
                s.spell_level === (payload.new as { spell_level: number }).spell_level
                  ? { ...s, ...(payload.new as typeof s) }
                  : s
              )
            );
          } else {
            load();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [load]);

  async function expend(spellLevel: number) {
    const slot = slots.find((s) => s.spell_level === spellLevel);
    if (!slot || slot.slots_expended >= slot.slots_total) return;
    const newExpended = slot.slots_expended + 1;
    await supabase
      .from("character_spell_slots")
      .update({ slots_expended: newExpended })
      .eq("character_id", characterId)
      .eq("spell_level", spellLevel);
    setSlots((prev) =>
      prev.map((s) => (s.spell_level === spellLevel ? { ...s, slots_expended: newExpended } : s))
    );
  }

  async function recover(spellLevel: number) {
    const slot = slots.find((s) => s.spell_level === spellLevel);
    if (!slot || slot.slots_expended <= 0) return;
    const newExpended = slot.slots_expended - 1;
    await supabase
      .from("character_spell_slots")
      .update({ slots_expended: newExpended })
      .eq("character_id", characterId)
      .eq("spell_level", spellLevel);
    setSlots((prev) =>
      prev.map((s) => (s.spell_level === spellLevel ? { ...s, slots_expended: newExpended } : s))
    );
  }

  async function longRest() {
    await supabase
      .from("character_spell_slots")
      .update({ slots_expended: 0 })
      .eq("character_id", characterId);
    setSlots((prev) => prev.map((s) => ({ ...s, slots_expended: 0 })));
  }

  return { slots, loading, expend, recover, longRest, reload: load };
}
