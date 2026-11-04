import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CharacterAttack, CharacterInventoryItem, CharacterSpell } from "../types/character.types";

async function fetchInventory(characterId: string) {
  const { data } = await supabase
    .from("character_inventory")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });
  return (data ?? []) as CharacterInventoryItem[];
}

async function fetchAttacks(characterId: string) {
  const { data } = await supabase
    .from("character_attacks")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });
  return (data ?? []) as CharacterAttack[];
}

async function fetchSpells(characterId: string) {
  const { data } = await supabase
    .from("character_spells")
    .select("*")
    .eq("character_id", characterId)
    .order("level", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as CharacterSpell[];
}

/**
 * A character's inventory, attacks and spells, kept in step when the other
 * side (player or DM) saves a change.
 */
export function useCharacterDetails(characterId: string | undefined) {
  const [inventory, setInventory] = useState<CharacterInventoryItem[]>([]);
  const [attacks, setAttacks] = useState<CharacterAttack[]>([]);
  const [spells, setSpells] = useState<CharacterSpell[]>([]);

  // Fire-and-forget: callers just ask for fresh rows after a save.
  const reloadInventory = useCallback(() => {
    if (characterId) void fetchInventory(characterId).then(setInventory);
  }, [characterId]);
  const reloadAttacks = useCallback(() => {
    if (characterId) void fetchAttacks(characterId).then(setAttacks);
  }, [characterId]);
  const reloadSpells = useCallback(() => {
    if (characterId) void fetchSpells(characterId).then(setSpells);
  }, [characterId]);

  useEffect(() => {
    if (!characterId) return;
    let cancelled = false;
    const guard =
      <T,>(set: (rows: T) => void) =>
      (rows: T) => {
        if (!cancelled) set(rows);
      };
    const loadInventory = () => void fetchInventory(characterId).then(guard(setInventory));
    const loadAttacks = () => void fetchAttacks(characterId).then(guard(setAttacks));
    const loadSpells = () => void fetchSpells(characterId).then(guard(setSpells));
    loadInventory();
    loadAttacks();
    loadSpells();

    const filter = `character_id=eq.${characterId}`;
    const channel = supabase
      .channel(`character-details:${characterId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "character_inventory", filter }, loadInventory)
      .on("postgres_changes", { event: "*", schema: "public", table: "character_attacks", filter }, loadAttacks)
      .on("postgres_changes", { event: "*", schema: "public", table: "character_spells", filter }, loadSpells)
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [characterId]);

  return { inventory, attacks, spells, reloadInventory, reloadAttacks, reloadSpells };
}
