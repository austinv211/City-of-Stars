import { supabase } from "@/lib/supabase";
import { finalAbilityScores, abilityModifier } from "../types/character.types";
import type { WizardState } from "../types/character.types";
import { CLASSES } from "../data/dnd2024.constants";
import { SPECIES_TRAITS } from "../data/speciesTraits";

/**
 * The steps of creating a character from the wizard, in order. Split out of
 * useCharacterMutation.commitCharacter, which ran them all in one function;
 * the hook still owns sequencing, loading state and rollback.
 */

const BUCKET = "character-portraits";

/** The wizard's portrait goes up before the character exists, under a temp name. */
export async function uploadTempPortrait(userId: string, file: File | null): Promise<string | null> {
  if (!file) return null;
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/tmp-${String(Date.now())}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** A player's first character becomes active; later ones start as drafts. */
async function hasActiveCharacter(campaignId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("characters")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("owner_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return !!data;
}

export async function insertCharacter(
  state: WizardState,
  campaignId: string,
  userId: string,
  portraitUrl: string | null,
): Promise<string> {
  const activate = !(await hasActiveCharacter(campaignId, userId));
  const { data, error } = await supabase
    .from("characters")
    .insert({
      campaign_id: campaignId,
      owner_id: userId,
      name: state.name,
      species: state.species,
      class: state.characterClass,
      subclass: state.subclass || null,
      background: state.background,
      level: 1,
      portrait_url: portraitUrl,
      status: activate ? "active" : "draft",
      is_locked: activate,
      backstory: state.backstory || null,
      alignment: state.alignment || null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) throw error;
  return data.id;
}

/**
 * HP, AC and species traits (size, speed, darkvision), then the ability
 * scores. HP and AC come from the final scores (base + background bonuses),
 * but ability_scores stores the BASE: every reader re-applies
 * background_bonus_* via finalAbilityScores, and every other writer (sheet
 * edits, level-up ASIs) subtracts it first. Storing final here counted the
 * +2/+1 twice on every new character.
 */
export async function applyScoresAndStats(state: WizardState, charId: string): Promise<void> {
  const final = finalAbilityScores(
    state.baseAbilityScores,
    state.backgroundBonusPrimary,
    state.backgroundBonusSecondary,
  );
  const hitDie = CLASSES.find((c) => c.name === state.characterClass)?.hitDie ?? 8;
  const hpMax = hitDie + abilityModifier(final.constitution);

  const { data: sp } = await supabase
    .from("srd_species")
    .select("size, speed, darkvision")
    .ilike("name", state.species)
    .maybeSingle();
  const darkvision = (sp?.darkvision as number | undefined) ?? 0;

  await supabase
    .from("characters")
    .update({
      hp_max: hpMax,
      hp_current: hpMax,
      ac: 10 + abilityModifier(final.dexterity),
      speed: (sp?.speed as number | undefined) ?? 30,
      // "Small or Medium" species default to Medium at creation.
      size: sp?.size === "Small" ? "Small" : "Medium",
      darkvision: darkvision > 0 ? darkvision : null,
      hit_dice_current: 1,
    })
    .eq("id", charId);

  const { error } = await supabase.from("ability_scores").insert({
    character_id: charId,
    ...state.baseAbilityScores,
    method: state.abilityScoreMethod,
    background_bonus_primary: state.backgroundBonusPrimary,
    background_bonus_secondary: state.backgroundBonusSecondary,
  });
  if (error) throw error;
}

/** srd_backgrounds' generated row types its columns loosely. */
interface BackgroundGrants {
  skill_proficiencies: string[] | null;
  tool_proficiency: string | null;
  feat: string | null;
}

/**
 * Class skill picks, plus the background's grants (skills, a tool, an origin
 * feat) when it has parsed SRD data. Uses that data, no hardcoded values.
 */
export async function applyProficiencies(state: WizardState, charId: string): Promise<void> {
  const { data } = await supabase
    .from("srd_backgrounds")
    .select("skill_proficiencies, tool_proficiency, feat")
    .ilike("name", state.background)
    .maybeSingle<BackgroundGrants>();
  const bg = data;

  const classSkills = new Set(state.skillProficiencies);
  const backgroundSkills = (bg?.skill_proficiencies ?? []).filter((s) => !classSkills.has(s));
  const rows = [
    ...state.skillProficiencies.map((skill) => ({ skill, source: "class" })),
    ...backgroundSkills.map((skill) => ({ skill, source: "background" })),
  ].map((r) => ({ ...r, character_id: charId, is_expertise: false }));

  if (rows.length > 0) {
    const { error } = await supabase.from("character_proficiencies").insert(rows);
    if (error) throw error;
  }
  if (bg?.tool_proficiency) {
    await supabase.from("characters").update({ tool_proficiencies: [bg.tool_proficiency] }).eq("id", charId);
  }
  if (bg?.feat) {
    await supabase.from("character_features").insert({
      character_id: charId,
      name: bg.feat,
      level_gained: 1,
      source: "feat",
      description: `Origin feat from the ${state.background} background.`,
    });
  }
}

/** Species traits, recorded as structured features (source = species). */
export async function applySpeciesTraits(state: WizardState, charId: string): Promise<void> {
  const traits = SPECIES_TRAITS[state.species] ?? [];
  if (traits.length === 0) return;
  await supabase.from("character_features").insert(
    traits.map((t, i) => ({
      character_id: charId,
      name: t.name,
      level_gained: 1,
      source: "species",
      description: t.description,
      sort_order: i,
    })),
  );
}

/**
 * Move the temp portrait under the character's folder. Not worth failing the
 * whole creation over: on any error the portrait stays at its temp path.
 */
export async function finalizePortrait(
  userId: string,
  charId: string,
  file: File | null,
  tempUrl: string | null,
): Promise<void> {
  if (!file || !tempUrl) return;
  try {
    const ext = file.name.split(".").pop() ?? "jpg";
    const finalPath = `${userId}/${charId}/portrait-${String(Date.now())}.${ext}`;
    const tmpPath = tempUrl.split(`/${BUCKET}/`)[1];
    await supabase.storage.from(BUCKET).move(tmpPath, finalPath);
    const url = supabase.storage.from(BUCKET).getPublicUrl(finalPath).data.publicUrl;
    await supabase.from("characters").update({ portrait_url: url }).eq("id", charId);
  } catch {
    // The portrait stays at its temp path.
  }
}
