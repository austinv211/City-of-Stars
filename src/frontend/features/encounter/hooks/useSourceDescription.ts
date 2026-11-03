import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRuleByTitle } from "@/lib/dnd5eApi";
import { publicActionText } from "../lib/publicText";
import type {
  EncounterParticipant,
  MonsterSpecialAbility,
  RollSource,
} from "../types/encounter.types";

const UNARMED_TEXT =
  "Deal 1 + Strength modifier bludgeoning damage, or instead Grapple or Shove the target.";

/** A monster's own text for an action, from the stat block on its row. */
function monsterText(actor: EncounterParticipant, source: RollSource): string | null {
  const lists: (MonsterSpecialAbility[] | null)[] =
    source.type === "legendary"
      ? [actor.legendary_actions]
      : [actor.actions, actor.special_abilities];
  const found = lists.flatMap((l) => l ?? []).find((a) => a.name === source.name);
  return found?.desc ?? null;
}

/** Text that needs a lookup: SRD spells and rules, or a weapon's notes. */
async function fetchText(actor: EncounterParticipant | null, source: RollSource): Promise<string | null> {
  if (source.type === "spell") {
    const { data } = await supabase
      .from("srd_spells")
      .select("description")
      .ilike("name", source.name)
      .limit(1)
      .maybeSingle();
    return (data?.description as string | null | undefined) ?? null;
  }
  if (source.type === "standard_action") return (await getRuleByTitle(source.name))?.content ?? null;
  if (source.type === "weapon" && actor?.character_id) {
    const { data } = await supabase
      .from("character_attacks")
      .select("notes")
      .eq("character_id", actor.character_id)
      .eq("name", source.name)
      .limit(1)
      .maybeSingle();
    return (data?.notes as string | null | undefined) ?? null;
  }
  return null;
}

/**
 * What an ability does, for the quick view. Monster text is read from the
 * stat block already loaded (and scrubbed of numbers for players); spells,
 * rules and weapon notes are fetched once the view opens.
 */
export function useSourceDescription(
  actor: EncounterParticipant | null,
  source: RollSource | undefined,
  viewerIsDM: boolean,
  open: boolean,
): { text: string | null; loading: boolean } {
  const [fetched, setFetched] = useState<{ key: string; text: string | null } | null>(null);
  const local = source ? localText(actor, source) : null;
  const key = source ? `${actor?.id ?? ""}:${source.type}:${source.name}` : "";

  useEffect(() => {
    if (!open || !source || local !== undefined || fetched?.key === key) return;
    let live = true;
    void fetchText(actor, source).then((text) => {
      if (live) setFetched({ key, text });
    });
    return () => {
      live = false;
    };
  }, [open, key, local, fetched?.key, actor, source]);

  if (!source) return { text: null, loading: false };
  if (local !== undefined) {
    const scrub = !!local && !viewerIsDM && !!actor && !actor.is_player;
    return { text: scrub ? publicActionText(local) : local, loading: false };
  }
  const done = fetched?.key === key;
  return { text: done ? fetched.text : null, loading: open && !done };
}

/** Text known without a fetch; undefined when one is needed. */
function localText(actor: EncounterParticipant | null, source: RollSource): string | null | undefined {
  if (source.type === "unarmed") return UNARMED_TEXT;
  if (source.type === "monster_action" || source.type === "legendary") {
    return actor ? monsterText(actor, source) : null;
  }
  return undefined;
}
