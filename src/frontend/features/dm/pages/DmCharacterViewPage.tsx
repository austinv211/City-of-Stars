import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { CharacterSheet } from "@/features/characters/components/CharacterSheet";
import { CharacterAuditLog } from "@/features/characters/components/CharacterAuditLog";
import { useCharacter } from "@/features/characters/hooks/useCharacter";
import { useCampaign } from "@/core/context/CampaignContext";
import { supabase } from "@/lib/supabase";
import type { CharacterInventoryItem, CharacterAttack, CharacterSpell } from "@/features/characters/types/character.types";

export default function DmCharacterViewPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { isDM } = useCampaign();
  const { character, loading, error, reload: reloadCharacter } = useCharacter(characterId);
  const [inventory, setInventory] = useState<CharacterInventoryItem[]>([]);
  const [attacks, setAttacks] = useState<CharacterAttack[]>([]);
  const [spells, setSpells] = useState<CharacterSpell[]>([]);

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

  return (
    <div className="px-4 sm:px-6 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/dm/characters")}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
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
      />
      <div className="mt-6">
        <CharacterAuditLog characterId={character.id} />
      </div>
    </div>
  );
}
