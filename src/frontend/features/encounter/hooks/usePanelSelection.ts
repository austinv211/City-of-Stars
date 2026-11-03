import { useState } from "react";
import { peekReleaseKey, resolvePanelId, type StagePhase } from "../lib/encounterStage";
import {
  setTarget,
  targetOf,
  toggleTarget,
  type TargetMap,
} from "../lib/targeting";
import type { EncounterParticipant } from "../types/encounter.types";

interface Input {
  isDM: boolean;
  participants: EncounterParticipant[];
  activeId: string | null;
  ownId: string | null;
  phase: StagePhase | undefined;
}

/**
 * Whose card is showing and who is aiming at whom.
 *
 * The panel follows the viewer's default (the acting combatant for the DM,
 * their own for a player); clicking another card is a peek that lapses on
 * its own -- see peekReleaseKey. Targets are kept per acting combatant.
 */
export function usePanelSelection({ isDM, participants, activeId, ownId, phase }: Input) {
  // Valid while `key` matches; a stale peek simply stops applying.
  const [peek, setPeek] = useState<{ id: string; key: string } | null>(null);
  const [targets, setTargets] = useState<TargetMap>({});

  const liveIds = new Set(participants.map((p) => p.id));
  const byId = (id: string | null) => participants.find((p) => p.id === id) ?? null;

  const releaseKey = peekReleaseKey(isDM, phase, activeId);
  const peekId = peek?.key === releaseKey && liveIds.has(peek.id) ? peek.id : null;
  const homeId = isDM ? activeId : ownId;
  const panelId = resolvePanelId({ isDM, ownId, activeId, peekId });

  function viewParticipant(id: string | null) {
    setPeek(id && id !== homeId ? { id, key: releaseKey } : null);
  }

  // Players aim as their own combatant; the DM as whoever's panel is open.
  const actorId = isDM ? panelId : ownId;
  function updateTargets(change: (map: TargetMap, actor: string) => TargetMap) {
    if (actorId) setTargets((map) => change(map, actorId));
  }

  return {
    /** The card being looked at instead of the default; null when following. */
    peekId,
    panelParticipant: byId(panelId),
    viewParticipant,
    /** Clicking the card already being peeked goes back to the default. */
    selectParticipant: (id: string) => {
      viewParticipant(id === peekId ? null : id);
    },
    backToDefault: () => {
      setPeek(null);
    },
    /** The combatant doing the aiming, whose target `targetParticipant` is. */
    actor: byId(actorId),
    targetParticipant: byId(targetOf(targets, actorId, liveIds)),
    setTargetId: (id: string | null) => {
      updateTargets((map, actor) => setTarget(map, actor, id));
    },
    toggleTarget: (id: string) => {
      updateTargets((map, actor) => toggleTarget(map, actor, id));
    },
  };
}
