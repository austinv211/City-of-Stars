/** Whole HP between 0 and the character's max; anything else is clamped. */
export function clampHp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.trunc(value)));
}

/** A character's real max HP; older sheets may only have a current value. */
export function maxHpOf(c: { hp_max: number | null; hp_current: number | null }): number {
  return Math.max(1, c.hp_max ?? c.hp_current ?? 1);
}

/** Where a character starts a fight by default: their sheet HP, within max. */
export function defaultStartHp(c: { hp_max: number | null; hp_current: number | null }): number {
  const max = maxHpOf(c);
  return clampHp(c.hp_current ?? max, max);
}
