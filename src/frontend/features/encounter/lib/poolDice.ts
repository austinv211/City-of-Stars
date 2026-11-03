/** One pool's dice: `[{ sides: 20, count: 1 }]`, `[{ sides: 6, count: 2 }]`. */
export type Pool = { sides: number; count: number }[];

export interface PoolResult {
  sum: number;
  /** The d20's face when the pool has one: for crit and fumble tallies. */
  d20?: number;
  rolls: number[];
}

/** Something that throws dice: the 3D box, or the fallback RNG. */
export type DiceSource = (pool: Pool) => Promise<number[][]>;

/** Total a pool from per-group faces, in pool order. */
export function totalPool(pool: Pool, faces: number[][]): PoolResult {
  const rolls = faces.flat();
  const d20Group = pool.findIndex((g) => g.sides === 20);
  return {
    sum: rolls.reduce((a, b) => a + b, 0),
    d20: d20Group === -1 ? undefined : faces[d20Group]?.[0],
    rolls,
  };
}

/**
 * Roll a pool, twice with advantage or disadvantage, keeping the better or
 * worse total. A lone d20 with advantage is the usual case; the same rule
 * applies to any pool.
 */
export async function rollPoolWith(
  source: DiceSource,
  pool: Pool,
  mode: { advantage: boolean; disadvantage: boolean },
): Promise<PoolResult & { discarded?: number }> {
  const first = totalPool(pool, await source(pool));
  if (!mode.advantage && !mode.disadvantage) return first;
  const second = totalPool(pool, await source(pool));
  const firstWins = mode.advantage ? first.sum >= second.sum : first.sum <= second.sum;
  const [keep, drop] = firstWins ? [first, second] : [second, first];
  return { ...keep, discarded: drop.sum };
}
