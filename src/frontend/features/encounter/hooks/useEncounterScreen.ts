import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { useCharacter } from "@/features/characters/hooks/useCharacter";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import type { Character, CharacterAttack } from "@/features/characters/types/character.types";
import type { EncounterParticipant } from "../types/encounter.types";
import { useDice } from "../context/DiceContext";
import { deriveStage } from "../lib/encounterStage";
import { withLabels } from "../lib/participantLabels";
import { targetInfo } from "../lib/attack";
import { useActiveEncounter } from "./useActiveEncounter";
import { useEncounterEffects } from "./useEncounterEffects";
import { useEncounterEvents } from "./useEncounterEvents";
import { useEncounterParticipants } from "./useEncounterParticipants";
import { usePanelSelection } from "./usePanelSelection";

/**
 * Everything the encounter screen knows and can do, in one object.
 *
 * Moved out of EncounterPage so the page is only "which layout, and what goes
 * in it": the same state now feeds the phone, tablet and desktop layouts, and
 * the regions inside them, without each re-deriving it.
 */
export function useEncounterScreen(playerMode: boolean) {
  const { user, displayName } = useAuth();
  const { campaign, isDM: contextIsDM, activeEncounterId } = useCampaign();
  // playerMode forces player behaviour regardless of campaign role (/encounter).
  const isDM = playerMode ? false : contextIsDM;
  const active = useActiveEncounter();
  const combat = useEncounterParticipants(activeEncounterId, campaign?.id);
  const effects = useEncounterEffects(activeEncounterId);
  // The event log is the DM's: history and undo.
  const log = useEncounterEvents(activeEncounterId, isDM);
  const { characters, loading: charsLoading } = useCharacters();
  const { history: allHistory } = useDice();

  // Named as the viewer should see them: nicknames, and "Goblin A/B" for twins.
  const participants = useMemo(
    () => withLabels(combat.participants, isDM),
    [combat.participants, isDM],
  );
  const { ownCharacter, ownParticipant } = findOwn(isDM, user?.id, characters, participants);
  const ownParticipantId = ownParticipant?.id ?? null;

  const encounter = active.encounter;
  const stage = encounter
    ? deriveStage({ isDM, encounter, participants, ownParticipantId, effects: effects.effects })
    : null;
  const selection = usePanelSelection({
    isDM,
    participants,
    activeId: encounter?.current_participant_id ?? null,
    ownId: ownParticipantId,
    phase: stage?.phase,
  });
  const { panelParticipant, targetParticipant } = selection;

  const { character: panelCharacter } = useCharacter(
    panelParticipant?.character_id ?? undefined,
  );
  // The viewer's own character with full scores, for the quick reference.
  const { character: ownCharacterFull } = useCharacter(
    !isDM ? ownCharacter?.id : undefined,
  );
  const attacks = useCharacterAttacks(panelParticipant?.character_id ?? null);

  const rollDeathSave = useDeathSaveRoll(isDM, participants, combat.applyDeathSaveRoll);

  return {
    isDM,
    playerMode,
    campaign,
    encounterId: activeEncounterId,
    encounter,
    loading: active.loading,
    /** Players wait for their own combatant before choosing a screen. */
    waitingForPlayerData: !isDM && (combat.loading || charsLoading),
    endEncounter: active.endEncounter,
    advanceTurn: active.advanceTurn,
    setLairInitiative: active.setLairInitiative,
    combat,
    participants,
    effects,
    history: allHistory.filter((e) => e.encounterId === activeEncounterId),
    log,
    rollDeathSave,

    ownCharacter,
    ownCharacterFull,
    ownParticipant,
    /** A non-DM with no combatant: can watch and make basic rolls. */
    isSpectator: !isDM && !ownParticipant,
    spectatorName: ownCharacter?.name ?? displayName,

    ...selection,
    panelCharacter,
    attacks,
    /** DMs control anyone; players only their own combatant. */
    canControlPanel: isDM || (!!panelParticipant && panelParticipant.id === ownParticipantId),

    targetId: targetParticipant?.id ?? null,
    target: targetParticipant ? targetInfo(isDM, targetParticipant) : null,
    canTarget: isDM || !!ownParticipant,

    stage,
  };
}

export type EncounterScreen = ReturnType<typeof useEncounterScreen>;

/**
 * Death saves roll through the dice system so the 3D die and result card
 * show (and broadcast/record); the d20 face then resolves the save.
 */
function useDeathSaveRoll(
  isDM: boolean,
  participants: EncounterParticipant[],
  applyRoll: (participantId: string, total: number) => Promise<unknown>,
) {
  const { campaign, activeEncounterId } = useCampaign();
  const { roll } = useDice();
  return async (participantId: string) => {
    if (!campaign) return;
    const p = participants.find((x) => x.id === participantId);
    const total = await roll({
      campaignId: campaign.id,
      encounterId: activeEncounterId,
      characterName: p?.name ?? "Unknown",
      rolledByDm: isDM,
      diceType: "1d20",
      sides: 20,
      modifier: 0,
      rollType: "Death Save",
    });
    await applyRoll(participantId, total);
  };
}

/**
 * The viewer's own character and its combatant. On the DM route the DM runs
 * the table, so a character they also own doesn't count.
 */
function findOwn(
  isDM: boolean,
  userId: string | undefined,
  characters: Character[],
  participants: EncounterParticipant[],
) {
  const ownCharacter = isDM
    ? null
    : (characters.find((c) => c.owner_id === userId && c.status === "active") ?? null);
  const ownParticipant = ownCharacter
    ? (participants.find((p) => p.character_id === ownCharacter.id) ?? null)
    : null;
  return { ownCharacter, ownParticipant };
}

/** The attacks on a character's sheet, for its action panel. */
function useCharacterAttacks(characterId: string | null): CharacterAttack[] {
  const [attacks, setAttacks] = useState<CharacterAttack[]>([]);
  useEffect(() => {
    if (!characterId) return;
    void supabase
      .from("character_attacks")
      .select("*")
      .eq("character_id", characterId)
      .then(({ data }) => {
        setAttacks((data as CharacterAttack[] | null) ?? []);
      });
  }, [characterId]);
  // Derived rather than reset in the effect: no character, no attacks.
  return characterId ? attacks : [];
}
