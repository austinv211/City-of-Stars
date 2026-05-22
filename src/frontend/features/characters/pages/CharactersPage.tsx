import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Plus } from "lucide-react";
import { CharacterCard } from "../components/CharacterCard";
import { useCharacters } from "../hooks/useCharacters";
import { useCharacterMutation } from "../hooks/useCharacterMutation";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import type { Character } from "../types/character.types";

export default function CharactersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { campaign } = useCampaign();
  const { isPlayerRole } = useAuth();
  const { characters, loading } = useCharacters();
  const { setActive, deleteCharacter } = useCharacterMutation();

  const [deleteTarget, setDeleteTarget] = useState<Character | null>(null);
  const [acting, setActing] = useState(false);

  const myCharacters = characters.filter((c) => c.owner_id === user?.id);
  const active = myCharacters.filter((c) => c.status === "active");
  const drafts = myCharacters.filter((c) => c.status === "draft");
  const backups = myCharacters.filter((c) => c.status === "backup");

  async function handleSetActive(character: Character) {
    setActing(true);
    await setActive(character.id);
    setActing(false);
  }

  async function handleDelete(character: Character) {
    setActing(true);
    await deleteCharacter(character.id);
    setDeleteTarget(null);
    setActing(false);
  }

  function cardProps(character: Character) {
    const isOwn = character.owner_id === user?.id;
    return {
      character,
      isOwn,
      onDelete: isOwn ? (c: Character) => setDeleteTarget(c) : undefined,
      onSetActive: isOwn ? (c: Character) => handleSetActive(c) : undefined,
    };
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Characters</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your characters in this campaign
          </p>
        </div>
        {campaign && isPlayerRole && (
          <Button onClick={() => navigate("/characters/new")} disabled={acting}>
            <Plus className="h-4 w-4 mr-2" />
            New Character
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !campaign ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <p className="text-muted-foreground">You are not a member of any campaign yet.</p>
          <p className="text-xs text-muted-foreground">Ask your Dungeon Master to add you to the campaign.</p>
        </div>
      ) : myCharacters.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-muted-foreground">No characters yet.</p>
          {isPlayerRole && (
            <Button onClick={() => navigate("/characters/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your Character
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-success">Active</h2>
              {active.map((c) => <CharacterCard key={c.id} {...cardProps(c)} />)}
            </section>
          )}
          {drafts.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">Drafts</h2>
              {drafts.map((c) => <CharacterCard key={c.id} {...cardProps(c)} />)}
            </section>
          )}
          {backups.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">Backup Characters</h2>
              {backups.map((c) => <CharacterCard key={c.id} {...cardProps(c)} />)}
            </section>
          )}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete character?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{deleteTarget?.name}</span> will be permanently
            deleted, including all inventory, spells, and attack data. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
