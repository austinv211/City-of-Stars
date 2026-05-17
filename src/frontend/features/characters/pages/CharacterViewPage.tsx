import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/core/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { CharacterSheet } from "../components/CharacterSheet";
import { useCharacter } from "../hooks/useCharacter";
import { useAuth } from "@/core/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { CharacterInventoryItem } from "../types/character.types";

export default function CharacterViewPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { character, loading, error } = useCharacter(characterId);
  const [inventory, setInventory] = useState<CharacterInventoryItem[]>([]);

  async function loadInventory() {
    if (!characterId) return;
    const { data } = await supabase
      .from("character_inventory")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: true });
    if (data) setInventory(data as CharacterInventoryItem[]);
  }

  useEffect(() => {
    loadInventory();
  }, [characterId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error ?? "Character not found"}</p>
        <Button variant="link" onClick={() => navigate("/characters")}>
          Back to characters
        </Button>
      </div>
    );
  }

  const isOwn = user?.id === character.owner_id;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/characters")}>
        <ChevronLeft className="h-4 w-4 mr-1" />
        Characters
      </Button>
      <CharacterSheet
        character={character}
        inventory={inventory}
        onRefreshInventory={loadInventory}
        isOwn={isOwn}
      />
    </div>
  );
}
