import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { ChevronLeft, Pencil, Lock, Check } from "lucide-react";
import { CharacterSheet } from "@/features/characters/components/CharacterSheet";
import { CharacterAuditLog } from "@/features/characters/components/CharacterAuditLog";
import { useCharacter } from "@/features/characters/hooks/useCharacter";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { supabase } from "@/lib/supabase";
import type { CharacterInventoryItem, CharacterAttack, CharacterSpell } from "@/features/characters/types/character.types";

const LOCK_STALE_MS = 30 * 60 * 1000;

export default function DmCharacterViewPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDM } = useCampaign();
  const { character, loading, error, reload: reloadCharacter } = useCharacter(characterId);
  const [inventory, setInventory] = useState<CharacterInventoryItem[]>([]);
  const [attacks, setAttacks] = useState<CharacterAttack[]>([]);
  const [spells, setSpells] = useState<CharacterSpell[]>([]);
  const holdingLockRef = useRef(false);

  async function loadInventory() {
    if (!characterId) return;
    const { data } = await supabase
      .from("character_inventory")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: true });
    if (data) setInventory(data as CharacterInventoryItem[]);
  }

  async function loadAttacks() {
    if (!characterId) return;
    const { data } = await supabase
      .from("character_attacks")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: true });
    if (data) setAttacks(data as CharacterAttack[]);
  }

  async function loadSpells() {
    if (!characterId) return;
    const { data } = await supabase
      .from("character_spells")
      .select("*")
      .eq("character_id", characterId)
      .order("level", { ascending: true })
      .order("name", { ascending: true });
    if (data) setSpells(data as CharacterSpell[]);
  }

  useEffect(() => {
    loadInventory();
    loadAttacks();
    loadSpells();
  }, [characterId]);

  // Sync inventory / attacks / spells when the other editor saves changes.
  useEffect(() => {
    if (!characterId) return;
    const channel = supabase
      .channel(`character-details:${characterId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "character_inventory", filter: `character_id=eq.${characterId}` }, () => loadInventory())
      .on("postgres_changes", { event: "*", schema: "public", table: "character_attacks",  filter: `character_id=eq.${characterId}` }, () => loadAttacks())
      .on("postgres_changes", { event: "*", schema: "public", table: "character_spells",   filter: `character_id=eq.${characterId}` }, () => loadSpells())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  // Release lock if the DM navigates away while editing
  useEffect(() => {
    return () => {
      if (holdingLockRef.current && characterId) {
        supabase.from("characters")
          .update({ editing_by: null, editing_since: null })
          .eq("id", characterId);
        holdingLockRef.current = false;
      }
    };
  }, [characterId]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-24" />
        <div className="flex items-start gap-6">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="flex-1 space-y-3 pt-1">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error ?? "Character not found"}</p>
        <Button variant="link" onClick={() => navigate("/dm/characters")}>
          Back to characters
        </Button>
      </div>
    );
  }

  const lockStale = character.editing_since
    ? Date.now() - new Date(character.editing_since).getTime() > LOCK_STALE_MS
    : false;
  const activeLock = lockStale ? null : character.editing_by;
  const isEditing = !!user && activeLock === user.id;
  const isLockedByOther = !!activeLock && !isEditing;

  async function enterEditMode() {
    if (!user || !characterId || isLockedByOther) return;
    await supabase.from("characters").update({
      editing_by: user.id,
      editing_since: new Date().toISOString(),
    }).eq("id", characterId);
    holdingLockRef.current = true;
  }

  async function exitEditMode() {
    if (!characterId) return;
    await supabase.from("characters").update({
      editing_by: null,
      editing_since: null,
    }).eq("id", characterId);
    holdingLockRef.current = false;
  }

  const editorLabel = isLockedByOther
    ? (activeLock === character.owner_id ? "the player" : "the DM")
    : null;

  return (
    <div className="px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dm/characters")}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {isDM && !isLockedByOther && (
          isEditing ? (
            <Button size="sm" onClick={exitEditMode} className="gap-1.5">
              <Check className="h-4 w-4" />
              Done Editing
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={enterEditMode} className="gap-1.5">
              <Pencil className="h-4 w-4" />
              Edit Character
            </Button>
          )
        )}

        {isLockedByOther && isDM && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 rounded-md px-3 py-1.5">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Currently being edited by {editorLabel}</span>
            </div>
            <Button size="sm" variant="outline" onClick={exitEditMode}>
              Force Unlock
            </Button>
          </div>
        )}
      </div>

      <CharacterSheet
        character={character}
        inventory={inventory}
        attacks={attacks}
        spells={spells}
        onRefreshInventory={loadInventory}
        onRefreshAttacks={loadAttacks}
        onRefreshSpells={loadSpells}
        onRefreshCharacter={reloadCharacter}
        isOwn={false}
        isDM={isDM}
        canEdit={isEditing}
      />
      <div className="mt-6">
        <CharacterAuditLog characterId={character.id} />
      </div>
    </div>
  );
}
