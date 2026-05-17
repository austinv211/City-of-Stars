import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { finalAbilityScores } from "../types/character.types";
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

      const charId: string = char.id;

      // 4. Insert ability scores (final = base + background bonuses)
      const final = finalAbilityScores(
        state.baseAbilityScores,
        state.backgroundBonusPrimary,
        state.backgroundBonusSecondary
      );
      const { error: scoresErr } = await supabase.from("ability_scores").insert({
        character_id: charId,
        ...final,
        method: state.abilityScoreMethod,
        background_bonus_primary: state.backgroundBonusPrimary,
        background_bonus_secondary: state.backgroundBonusSecondary,
      });
      if (scoresErr) throw scoresErr;

      // 5. Insert proficiencies (skills chosen + saving throws from class)
      const profRows = state.skillProficiencies.map((name) => ({
        character_id: charId,
        proficiency_type: "skill",
        name,
        is_expertise: false,
      }));
      if (profRows.length > 0) {
        const { error: profErr } = await supabase.from("character_proficiencies").insert(profRows);
        if (profErr) throw profErr;
      }

      // 6. Update portrait path with correct character id in path
      if (state.portraitFile && portraitUrl) {
        const ext = state.portraitFile.name.split(".").pop();
        const finalPath = `${user.id}/${charId}/portrait.${ext}`;
        await supabase.storage.from("character-portraits").move(
          portraitUrl.split("/character-portraits/")[1],
          finalPath
        );
        const { data: newUrl } = supabase.storage.from("character-portraits").getPublicUrl(finalPath);
        await supabase.from("characters").update({ portrait_url: newUrl.publicUrl }).eq("id", charId);
      }

      return charId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function setActive(characterId: string): Promise<void> {
    if (!user || !campaign) return;
    // Deactivate any existing active character
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

  async function updatePortrait(characterId: string, file: File): Promise<string> {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${characterId}/portrait.${ext}`;
    await supabase.storage.from("character-portraits").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("character-portraits").getPublicUrl(path);
    await supabase.from("characters").update({ portrait_url: data.publicUrl }).eq("id", characterId);
    return data.publicUrl;
  }

  return { commitCharacter, setActive, updatePortrait, loading, error };
}
