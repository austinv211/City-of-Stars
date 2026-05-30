// Leveling rule data. Pure — no runtime deps so both the app and the
// consistency guard (scripts/check-srd-consistency.ts) can import it.

// ASI levels per class (2024 SRD). Most classes: 4/8/12/16; Fighter & Rogue gain
// extras. Level 19 is an Epic Boon (a feat), NOT a generic ASI — see isEpicBoonLevel.
const ASI_LEVELS: Record<string, number[]> = {
  Fighter: [4, 6, 8, 12, 14, 16],
  Rogue:   [4, 8, 10, 12, 16],
};
const DEFAULT_ASI_LEVELS = [4, 8, 12, 16];

export function getAsiLevels(className: string): number[] {
  return ASI_LEVELS[className] ?? DEFAULT_ASI_LEVELS;
}

export function isAsiLevel(className: string, level: number): boolean {
  return getAsiLevels(className).includes(level);
}

// Every class gains an Epic Boon feat at level 19 (2024 SRD srd_class_features).
export function isEpicBoonLevel(level: number): boolean {
  return level === 19;
}
