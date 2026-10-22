/**
 * Ability-score maths — the single source of truth.
 *
 * `Math.floor((score - 10) / 2)` was reimplemented in four places before this:
 * wizard/Step3_AbilityScores.tsx, wizard/Step6_Review.tsx, DmMonstersPage.tsx
 * (as `abilityMod`), and twice inside lib/dnd5eApi.ts.
 *
 * It lives in `lib/` rather than in features/characters/types/character.types.ts
 * because `lib/dnd5eApi.ts` needs it, and the architecture rule in
 * eslint.config.js forbids `lib` from importing `features`. character.types.ts
 * re-exports it, so the ~15 existing call sites are unaffected.
 */

/** D&D 5e ability modifier: floor((score - 10) / 2). Negative for scores < 10. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Render a modifier the way a character sheet does: "+3", "0", "-1". */
export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** Shorthand for the common "score then parenthesised modifier" stat-block form. */
export function formatScoreWithModifier(score: number): string {
  return `${score} (${formatModifier(abilityModifier(score))})`;
}
