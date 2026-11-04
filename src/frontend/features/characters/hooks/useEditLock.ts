import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Character } from "../types/character.types";

/** A lock older than this is assumed abandoned (a closed laptop, a crash). */
const LOCK_STALE_MS = 30 * 60 * 1000;
const RECHECK_MS = 60 * 1000;

async function writeLock(characterId: string, userId: string | null) {
  await supabase
    .from("characters")
    .update({ editing_by: userId, editing_since: userId ? new Date().toISOString() : null })
    .eq("id", characterId);
}

/**
 * The one-editor-at-a-time lock on a character sheet: the player and the DM
 * can't both edit at once. Released when the editor leaves the page.
 */
export function useEditLock(character: Pick<Character, "id" | "owner_id" | "editing_by" | "editing_since"> | null, userId: string | undefined) {
  const holding = useRef(false);
  // Re-evaluated every minute so an abandoned lock frees itself on screen.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), RECHECK_MS);
    return () => clearInterval(timer);
  }, []);

  const characterId = character?.id;
  useEffect(() => {
    return () => {
      if (holding.current && characterId) {
        holding.current = false;
        void writeLock(characterId, null);
      }
    };
  }, [characterId]);

  const since = character?.editing_since ? new Date(character.editing_since).getTime() : null;
  const stale = since !== null && now - since > LOCK_STALE_MS;
  const activeLock = stale ? null : (character?.editing_by ?? null);
  const isEditing = !!userId && activeLock === userId;
  const isLockedByOther = !!activeLock && !isEditing;

  const enter = useCallback(async () => {
    if (!userId || !characterId || isLockedByOther) return;
    await writeLock(characterId, userId);
    holding.current = true;
  }, [userId, characterId, isLockedByOther]);

  const release = useCallback(async () => {
    if (!characterId) return;
    await writeLock(characterId, null);
    holding.current = false;
  }, [characterId]);

  return {
    isEditing,
    isLockedByOther,
    /** Who holds the lock, from the viewer's point of view. */
    editorLabel: activeLock === character?.owner_id ? "the player" : "the DM",
    enter,
    release,
  };
}
