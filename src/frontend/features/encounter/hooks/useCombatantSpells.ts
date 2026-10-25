import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CharacterSpell } from "@/features/characters/types/character.types";

/**
 * Spell lookups the encounter's action panel needs for one combatant. Moved
 * out of ActionPanel so the stage components take data as props rather than
 * querying the database themselves.
 *
 * NPCs have no character, so each hook resolves to empty for them.
 */

/** Names of the character's concentration spells, for the concentration picker. */
export function useConcentrationSpells(characterId: string | null): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    if (!characterId) {
      setNames([]);
      return;
    }
    void supabase
      .from("character_spells")
      .select("name")
      .eq("character_id", characterId)
      .eq("concentration", true)
      .then(({ data }) => {
        setNames((data ?? []).map((s) => s.name as string));
      });
  }, [characterId]);
  return names;
}

/** The character's spells that deal damage, shown as attack cards. */
export function useDamageSpells(characterId: string | null): CharacterSpell[] {
  const [spells, setSpells] = useState<CharacterSpell[]>([]);
  useEffect(() => {
    if (!characterId) {
      setSpells([]);
      return;
    }
    void supabase
      .from("character_spells")
      .select("*")
      .eq("character_id", characterId)
      .not("damage_dice", "is", null)
      .then(({ data }) => {
        setSpells((data as CharacterSpell[] | null) ?? []);
      });
  }, [characterId]);
  return spells;
}

/**
 * SRD descriptions for the named spells, keyed by lower-cased name, so attack
 * cards read straight from the parsed ruleset.
 */
export function useSpellDescriptions(names: string[]): Map<string, string> {
  const [descriptions, setDescriptions] = useState<Map<string, string>>(new Map());
  // A stable key: the caller builds a fresh array every render.
  const key = names.join("|");
  useEffect(() => {
    const wanted = key ? key.split("|") : [];
    if (wanted.length === 0) {
      setDescriptions(new Map());
      return;
    }
    void supabase
      .from("srd_spells")
      .select("name, description")
      .in("name", wanted)
      .then(({ data }) => {
        const m = new Map<string, string>();
        for (const r of data ?? []) {
          if (r.name && r.description) {
            m.set((r.name as string).toLowerCase(), r.description as string);
          }
        }
        setDescriptions(m);
      });
  }, [key]);
  return descriptions;
}
