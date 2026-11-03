/**
 * Who each combatant is aiming at. Keyed by the acting combatant, so a DM
 * switching between goblins keeps each goblin's own target.
 */
export type TargetMap = Readonly<Record<string, string>>;

/** Aim `actorId` at `targetId`, or clear its target with null. */
export function setTarget(
  map: TargetMap,
  actorId: string,
  targetId: string | null,
): TargetMap {
  const { [actorId]: _previous, ...rest } = map;
  return targetId && targetId !== actorId ? { ...rest, [actorId]: targetId } : rest;
}

/** Picking the current target again clears it. */
export function toggleTarget(map: TargetMap, actorId: string, targetId: string): TargetMap {
  return setTarget(map, actorId, map[actorId] === targetId ? null : targetId);
}

/** The actor's target, ignoring one that has left the encounter. */
export function targetOf(
  map: TargetMap,
  actorId: string | null,
  liveIds: ReadonlySet<string>,
): string | null {
  if (!actorId) return null;
  const id = map[actorId];
  return id && liveIds.has(id) ? id : null;
}
