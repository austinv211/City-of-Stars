import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import {
  applyProficiencies,
  applyScoresAndStats,
  applySpeciesTraits,
  finalizePortrait,
  insertCharacter,
  uploadTempPortrait,
} from "../lib/createCharacter";
import type { WizardState } from "../types/character.types";

/** The two pictures a character can have: round portrait, and full art. */
export type CharacterImage = "portrait" | "art";

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
      const portraitUrl = await uploadTempPortrait(user.id, state.portraitFile);
      charId = await insertCharacter(state, campaign.id, user.id, portraitUrl);
      await applyScoresAndStats(state, charId);
      await applyProficiencies(state, charId);
      await applySpeciesTraits(state, charId);
      await finalizePortrait(user.id, charId, state.portraitFile, portraitUrl);
      return charId;
    } catch (err) {
      // Roll back the character row if it was created but a later step failed.
      if (charId) {
        try {
          await supabase.from("characters").delete().eq("id", charId);
        } catch {
          /* best-effort */
        }
      }
      setError(err instanceof Error ? err.message : "Unknown error");
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

  /**
   * Upload a character picture and point the sheet at it. Each upload gets
   * its own file name: reusing one (as portraits did) left browsers showing
   * the cached old image after a change.
   */
  async function updateImage(characterId: string, kind: CharacterImage, file: File): Promise<string> {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${characterId}/${kind}-${String(Date.now())}.${ext}`;
    const bucket = supabase.storage.from("character-portraits");
    const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    const url = bucket.getPublicUrl(path).data.publicUrl;
    const column = kind === "art" ? "art_url" : "portrait_url";
    const { error: updateError } = await supabase.from("characters").update({ [column]: url }).eq("id", characterId);
    if (updateError) throw updateError;
    return url;
  }

  /** Remove the full art; the encounter falls back to the portrait. */
  async function clearArt(characterId: string): Promise<void> {
    await supabase.from("characters").update({ art_url: null }).eq("id", characterId);
  }

  return { commitCharacter, setActive, deleteCharacter, updateImage, clearArt, loading, error };
}
