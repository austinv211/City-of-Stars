import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { finalAbilityScores, abilityModifier } from "../types/character.types";
import { CLASSES } from "../data/dnd2024.constants";
import { SPECIES_TRAITS } from "../data/speciesTraits";
import type { WizardState } from "../types/character.types";

export function useCharacterMutation() {
  const { user } = useAuth();
  const { campaign } = useCampaign();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commitCharacter(state: WizardState): Promise<string> {
    if (!user || !campaign) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);

    let charId: string | null = null;

    try {
      // 1. Upload portrait if present
      let portraitUrl: string | null = null;
      if (state.portraitFile) {
        const ext = state.portraitFile.name.split(".").pop();
        const path = `${user.id}/tmp-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("character-portraits")
          .upload(path, state.portraitFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("character-portraits").getPublicUrl(path);
        portraitUrl = urlData.publicUrl;
      }

      // 2. Check whether the player already has an active character
      const { data: existing } = await supabase
        .from("characters")
        .select("id")
        .eq("campaign_id", campaign.id)
        .eq("owner_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      const shouldActivate = !existing;

      // 3. Insert character row
      const { data: char, error: charErr } = await supabase
        .from("characters")
        .insert({
          campaign_id: campaign.id,
          owner_id: user.id,
          name: state.name,
          species: state.species,
          class: state.characterClass,
          subclass: state.subclass || null,
          background: state.background,
          level: 1,
          portrait_url: portraitUrl,
          status: shouldActivate ? "active" : "draft",
          is_locked: shouldActivate,
          backstory: state.backstory || null,
          alignment: state.alignment || null,
        })
        .select()
        .single();
      if (charErr) throw charErr;

      charId = char.id;

      // 4. Insert ability scores (final = base + background bonuses)
      const final = finalAbilityScores(
        state.baseAbilityScores,
        state.backgroundBonusPrimary,
        state.backgroundBonusSecondary
      );
      const classData = CLASSES.find((c) => c.name === state.characterClass);
      const hitDie = classData?.hitDie ?? 8;
      const conMod = abilityModifier(final.constitution);
      const dexMod = abilityModifier(final.dexterity);
      const initHpMax = hitDie + conMod;
      const initAc = 10 + dexMod;

      // Apply species traits (size/speed/darkvision) from srd_species when available.
      const { data: sp } = await supabase
        .from("srd_species")
        .select("size, speed, darkvision")
        .ilike("name", state.species)
        .maybeSingle();
      const speciesSpeed = (sp?.speed as number | undefined) ?? 30;
      // 'Small or Medium' species default to Medium at creation.
      const speciesSize = sp?.size === "Small" ? "Small" : "Medium";
      const speciesDarkvision = (sp?.darkvision as number | undefined) ?? 0;

      await supabase
        .from("characters")
        .update({
          hp_max: initHpMax,
          hp_current: initHpMax,
          ac: initAc,
          speed: speciesSpeed,
          size: speciesSize,
          darkvision: speciesDarkvision > 0 ? speciesDarkvision : null,
          hit_dice_current: 1,
        })
        .eq("id", charId!);
      const { error: scoresErr } = await supabase.from("ability_scores").insert({
        character_id: charId,
        ...final,
        method: state.abilityScoreMethod,
        background_bonus_primary: state.backgroundBonusPrimary,
        background_bonus_secondary: state.backgroundBonusSecondary,
      });
      if (scoresErr) throw scoresErr;

      // 5. Insert proficiencies — class skill picks plus any SRD background grants.
      const profRows = state.skillProficiencies.map((skill) => ({
        character_id: charId,
        skill,
        source: "class",
        is_expertise: false,
      }));

      // Apply the chosen background's grants (skills, tool, origin feat) when the
      // background has parsed SRD data. Uses existing data — no hardcoded values.
      const { data: bg } = await supabase
        .from("srd_backgrounds")
        .select("skill_proficiencies, tool_proficiency, feat")
        .ilike("name", state.background)
        .maybeSingle();

      if (bg) {
        const classSkills = new Set(state.skillProficiencies);
        for (const skill of (bg.skill_proficiencies as string[] | null) ?? []) {
          if (!classSkills.has(skill)) {
            profRows.push({ character_id: charId, skill, source: "background", is_expertise: false });
          }
        }
      }

      if (profRows.length > 0) {
        const { error: profErr } = await supabase.from("character_proficiencies").insert(profRows);
        if (profErr) throw profErr;
      }

      if (bg) {
        const tool = bg.tool_proficiency as string | null;
        if (tool) {
          await supabase.from("characters").update({ tool_proficiencies: [tool] }).eq("id", charId!);
        }
        const feat = bg.feat as string | null;
        if (feat) {
          await supabase.from("character_features").insert({
            character_id: charId,
            name: feat,
            level_gained: 1,
            source: "feat",
            description: `Origin feat from the ${state.background} background.`,
          });
        }
      }

      // Record species traits as structured features (source = species).
      const speciesTraits = SPECIES_TRAITS[state.species] ?? [];
      if (speciesTraits.length > 0) {
        await supabase.from("character_features").insert(
          speciesTraits.map((t, i) => ({
            character_id: charId,
            name: t.name,
            level_gained: 1,
            source: "species",
            description: t.description,
            sort_order: i,
          })),
        );
      }

      // 6. Move portrait to final path — non-fatal, portrait stays at temp if this fails
      if (state.portraitFile && portraitUrl && charId) {
        try {
          const ext = state.portraitFile.name.split(".").pop();
          const finalPath = `${user.id}/${charId!}/portrait.${ext}`;
          const tmpPath = portraitUrl.split("/character-portraits/")[1];
          await supabase.storage.from("character-portraits").move(tmpPath, finalPath);
          const { data: newUrl } = supabase.storage
            .from("character-portraits")
            .getPublicUrl(finalPath);
          await supabase
            .from("characters")
            .update({ portrait_url: newUrl.publicUrl })
            .eq("id", charId);
        } catch {
          // portrait stays at temp path — not worth failing the whole creation
        }
      }

      return charId!;
    } catch (err) {
      // Roll back the character row if it was created but later steps failed
      if (charId) {
        try { await supabase.from("characters").delete().eq("id", charId); } catch { /* best-effort */ }
      }
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function setActive(characterId: string): Promise<void> {
    if (!user || !campaign) return;
    await supabase
      .from("characters")
      .update({ status: "backup", is_locked: false })
      .eq("campaign_id", campaign.id)
      .eq("owner_id", user.id)
      .eq("status", "active");

    await supabase
      .from("characters")
      .update({ status: "active", is_locked: true })
      .eq("id", characterId);
  }

  async function deleteCharacter(characterId: string): Promise<void> {
    await supabase.from("characters").delete().eq("id", characterId);
  }

  async function updatePortrait(characterId: string, file: File): Promise<string> {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${characterId}/portrait.${ext}`;
    await supabase.storage.from("character-portraits").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("character-portraits").getPublicUrl(path);
    await supabase.from("characters").update({ portrait_url: data.publicUrl }).eq("id", characterId);
    return data.publicUrl;
  }

  return { commitCharacter, setActive, deleteCharacter, updatePortrait, loading, error };
}
