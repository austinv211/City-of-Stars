import { useNavigate } from "react-router";
import { ChevronLeft, Pencil, Lock, Check } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { ActiveSurges } from "@/core/components/wildmagic/ActiveSurges";
import { useAuth } from "@/core/context/AuthContext";
import { CharacterSheet } from "./CharacterSheet";
import { CharacterAuditLog } from "./CharacterAuditLog";
import { useCharacter } from "../hooks/useCharacter";
import { useCharacterDetails } from "../hooks/useCharacterDetails";
import { useEditLock } from "../hooks/useEditLock";

interface Props {
  characterId: string | undefined;
  /**
   * player: the character's own page. dm: can edit, force-unlock, and sees
   * the audit log. observer: an admin looking in on a campaign they don't run.
   */
  viewer: "player" | "dm" | "observer";
  /** Where "Back" and the not-found link go; -1 is the previous page. */
  backTo: string | -1;
}

/** A character sheet page with its edit lock, shared by the player and DM routes. */
export function CharacterView({ characterId, viewer, backTo }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { character, loading, error, reload } = useCharacter(characterId);
  const details = useCharacterDetails(characterId);
  const lock = useEditLock(character, user?.id);

  if (loading) return <CharacterViewSkeleton />;

  if (error || !character) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error ?? "Character not found"}</p>
        <Button variant="link" onClick={() => void navigate(backTo === -1 ? "/characters" : backTo)}>
          Back to characters
        </Button>
      </div>
    );
  }

  const isDM = viewer === "dm";
  const isOwn = !isDM && user?.id === character.owner_id;
  const mayEdit = isOwn || isDM;

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => void (backTo === -1 ? navigate(-1) : navigate(backTo))}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        <EditControls lock={lock} mayEdit={mayEdit} canForceUnlock={isDM} />
      </div>

      <ActiveSurges characterId={character.id} canEnd={mayEdit} />

      <CharacterSheet
        character={character}
        inventory={details.inventory}
        attacks={details.attacks}
        spells={details.spells}
        onRefreshInventory={details.reloadInventory}
        onRefreshAttacks={details.reloadAttacks}
        onRefreshSpells={details.reloadSpells}
        onRefreshCharacter={() => void reload()}
        isOwn={isOwn}
        isDM={isDM}
        canEdit={lock.isEditing}
      />

      {viewer !== "player" && (
        <div className="mt-6">
          <CharacterAuditLog characterId={character.id} />
        </div>
      )}
    </div>
  );
}

/** Edit / Done, or who holds the lock (and, for the DM, a way to break it). */
function EditControls({ lock, mayEdit, canForceUnlock }: {
  lock: ReturnType<typeof useEditLock>;
  mayEdit: boolean;
  canForceUnlock: boolean;
}) {
  if (lock.isLockedByOther) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5 text-sm text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>Currently being edited by {lock.editorLabel}</span>
        </div>
        {canForceUnlock && (
          <Button size="sm" variant="outline" onClick={() => void lock.release()}>
            Force Unlock
          </Button>
        )}
      </div>
    );
  }
  if (!mayEdit) return null;
  return (
    <Button
      size="sm"
      variant={lock.isEditing ? "default" : "outline"}
      className="gap-1.5"
      onClick={() => void (lock.isEditing ? lock.release() : lock.enter())}
    >
      {lock.isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
      {lock.isEditing ? "Done Editing" : "Edit Character"}
    </Button>
  );
}

function CharacterViewSkeleton() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
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
