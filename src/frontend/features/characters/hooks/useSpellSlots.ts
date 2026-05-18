import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CharacterSpellSlot } from "../types/character.types";

// 2014 SRD spell slot table by class and level.
// Key: class name (lowercase), value: array of 9 slot counts per spell level for each character level 1-20.
// Each row: index = character_level - 1, value = [L1, L2, L3, L4, L5, L6, L7, L8, L9]
const FULL_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // level 1
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // level 2
  [4, 2, 0, 0, 0, 0, 0, 0, 0], // level 3
  [4, 3, 0, 0, 0, 0, 0, 0, 0], // level 4
  [4, 3, 2, 0, 0, 0, 0, 0, 0], // level 5
  [4, 3, 3, 0, 0, 0, 0, 0, 0], // level 6
  [4, 3, 3, 1, 0, 0, 0, 0, 0], // level 7
  [4, 3, 3, 2, 0, 0, 0, 0, 0], // level 8
  [4, 3, 3, 3, 1, 0, 0, 0, 0], // level 9
  [4, 3, 3, 3, 2, 0, 0, 0, 0], // level 10
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // level 11
  [4, 3, 3, 3, 2, 1, 0, 0, 0], // level 12
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // level 13
  [4, 3, 3, 3, 2, 1, 1, 0, 0], // level 14
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // level 15
  [4, 3, 3, 3, 2, 1, 1, 1, 0], // level 16
  [4, 3, 3, 3, 2, 1, 1, 1, 1], // level 17
  [4, 3, 3, 3, 3, 1, 1, 1, 1], // level 18
  [4, 3, 3, 3, 3, 2, 1, 1, 1], // level 19
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // level 20
];

const HALF_CASTER_SLOTS: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
];

const FULL_CASTER_CLASSES = ["bard", "cleric", "druid", "sorcerer", "wizard"];
const HALF_CASTER_CLASSES = ["paladin", "ranger"];

export function slotsForClass(className: string, level: number): number[] {
  const idx = Math.max(0, Math.min(19, level - 1));
  const key = className.toLowerCase();
  if (FULL_CASTER_CLASSES.includes(key)) return FULL_CASTER_SLOTS[idx];
  if (HALF_CASTER_CLASSES.includes(key)) return HALF_CASTER_SLOTS[idx];
  return Array(9).fill(0);
}

export function useSpellSlots(characterId: string, characterClass: string, level: number) {
  const [slots, setSlots] = useState<CharacterSpellSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const computedTotals = slotsForClass(characterClass, level);

  const load = useCallback(async () => {
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
