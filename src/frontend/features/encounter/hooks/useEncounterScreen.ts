import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { useCharacter } from "@/features/characters/hooks/useCharacter";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import type { CharacterAttack } from "@/features/characters/types/character.types";
import { useDice } from "../context/DiceContext";
import { deriveStage } from "../lib/encounterStage";
import { targetInfo } from "../lib/attack";
import { useActiveEncounter } from "./useActiveEncounter";
import { useEncounterEffects } from "./useEncounterEffects";
import { useEncounterParticipants } from "./useEncounterParticipants";

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
  const { characters, loading: charsLoading } = useCharacters();
  const { history: allHistory, roll } = useDice();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Who the viewer's attacks are aimed at. Not selectedId, which is whose
  // panel is showing.
  const [targetId, setTargetId] = useState<string | null>(null);

  const { participants } = combat;
  const ownCharacter = characters.find(
    (c) => c.owner_id === user?.id && c.status === "active",
  );
  const ownParticipant =
    participants.find((p) => p.character_id === ownCharacter?.id) ?? null;
  // Players default to their own combatant; the DM, who runs whoever is up,
  // follows the turn until they pick someone.
  const panelParticipantId =
    selectedId ??
    ownParticipant?.id ??
    (isDM ? (active.encounter?.current_participant_id ?? null) : null);
  const panelParticipant =
    participants.find((p) => p.id === panelParticipantId) ?? null;

  const { character: panelCharacter } = useCharacter(
    panelParticipant?.character_id ?? undefined,
  );
  // The viewer's own character with full scores, for the quick reference.
  const { character: ownCharacterFull } = useCharacter(
    !isDM ? ownCharacter?.id : undefined,
  );
  const attacks = useCharacterAttacks(panelParticipant?.character_id ?? null);

  // Death saves roll through the dice system so the 3D die and result card
  // show (and broadcast/record); the d20 face then resolves the save.
  async function rollDeathSave(participantId: string) {
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
    await combat.applyDeathSaveRoll(participantId, total);
  }

  const encounter = active.encounter;
  const targetParticipant = participants.find((p) => p.id === targetId);
  const ownParticipantId = ownParticipant?.id ?? null;

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
    rollDeathSave,

    ownCharacter: ownCharacter ?? null,
    ownCharacterFull,
    ownParticipant,
    /** A non-DM with no combatant: can watch and make basic rolls. */
    isSpectator: !isDM && !ownParticipant,
    spectatorName: ownCharacter?.name ?? displayName,

    selectedId,
    setSelectedId,
    panelParticipant,
    panelCharacter,
    attacks,
    /** DMs control anyone; players only their own combatant. */
    canControlPanel:
      isDM || (!!panelParticipant && panelParticipant.id === ownParticipantId),

    targetId,
    setTargetId,
    toggleTarget: (id: string) => {
      setTargetId((cur) => (cur === id ? null : id));
    },
    target: targetParticipant ? targetInfo(isDM, targetParticipant) : null,
    canTarget: isDM || !!ownParticipant,

    stage: encounter
      ? deriveStage({
          isDM,
          encounter,
          participants,
          ownParticipantId,
          effects: effects.effects,
        })
      : null,
  };
}

export type EncounterScreen = ReturnType<typeof useEncounterScreen>;

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
