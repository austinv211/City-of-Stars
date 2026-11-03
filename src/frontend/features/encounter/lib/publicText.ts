/**
 * A monster action's text as players may read it: the flavour and what it
 * does, without the numbers that give its stat block away.
 *
 * SRD text mixes the two: "Melee Weapon Attack: +4 to hit, reach 5 ft., one
 * target. Hit: 5 (1d6 + 2) slashing damage." Players keep "Melee Weapon
 * Attack: reach 5 ft., one target. Hit: slashing damage." Save DCs stay, since
 * the table hears them when it rolls the save.
 */
export function publicActionText(desc: string): string {
  return (
    desc
      // "+4 to hit," (2014) and "Attack Roll: +4," (2024).
      .replace(/\s*[+-]\d+\s+to hit,?/gi, "")
      .replace(/(Attack Roll:)\s*[+-]\d+,?/gi, "$1")
      // "5 (1d6 + 2) slashing" → "slashing"; a bare "(1d6 + 2)" too.
      .replace(/\b\d+\s*\(\s*\d+d\d+(?:\s*[+-]\s*\d+)?\s*\)\s*/gi, "")
      .replace(/\(\s*\d+d\d+(?:\s*[+-]\s*\d+)?\s*\)\s*/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}
