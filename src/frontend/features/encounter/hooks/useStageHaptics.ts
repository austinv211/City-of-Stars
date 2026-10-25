import { useEffect, useRef } from "react";
import { buzz, HAPTIC } from "@/core/lib/haptics";
import type { StagePhase } from "../lib/encounterStage";

/**
 * Vibrate when the viewer's own moment arrives: their turn starts, or they
 * go down. Fires on the transition only -- opening the screen mid-turn, or a
 * reload, must not buzz.
 */
export function useStageHaptics(phase: StagePhase | undefined) {
  const prev = useRef(phase);
  useEffect(() => {
    const was = prev.current;
    prev.current = phase;
    if (was === undefined || was === phase) return;
    if (phase === "my-turn") buzz(HAPTIC.turn);
    else if (phase === "dying") buzz(HAPTIC.downed);
  }, [phase]);
}
