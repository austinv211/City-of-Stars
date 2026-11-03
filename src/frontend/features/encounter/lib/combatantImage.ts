import type { EncounterParticipant } from "../types/encounter.types";

type Pictured = Pick<EncounterParticipant, "portrait_url" | "art_url">;

/**
 * Which picture to show. Banners prefer full art and fall back to the
 * portrait; small thumbnails prefer the portrait (a face reads at 32px, a
 * landscape doesn't) and fall back to the art.
 */
export function bannerImage(p: Pictured): string | null {
  return p.art_url ?? p.portrait_url;
}

export function thumbImage(p: Pictured): string | null {
  return p.portrait_url ?? p.art_url;
}

/** "Isolde Brightwater" -> "IB"; "Goblin A" -> "GA"; one word -> its first two letters. */
export function initialsOf(name: string): string {
  const words = name.replace(/\(.*\)/, "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
