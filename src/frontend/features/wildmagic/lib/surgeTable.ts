/** One row of a campaign's wild magic table (public.wild_magic_surges). */
export interface SurgeEntry {
  id: string;
  campaign_id: string;
  roll_min: number | null;
  roll_max: number | null;
  name: string;
  description: string | null;
  lasts_rounds: number | null;
  created_at: string;
}

export type SurgeDraft = Pick<SurgeEntry, "roll_min" | "roll_max" | "name" | "description" | "lasts_rounds">;

const NAME_MAX = 120;

/** d100 faces print as two digits, and 100 is "00". */
const face = (n: number) => (n === 100 ? "00" : String(n).padStart(2, "0"));

export function formatRange(min: number | null, max: number | null): string {
  if (min === null || max === null) return "—";
  return min === max ? face(min) : `${face(min)}–${face(max)}`;
}

/** "00" on a d100 is 100. */
const readFace = (s: string) => (Number(s) === 0 ? 100 : Number(s));

// "01-02 Text", "7. Text", "11–12 | Name | Description", "00 Text"
const LINE = /^\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?\s*[|.:)\t]?\s*(.+?)\s*$/;

/** A short name for a long effect: its first sentence, trimmed to fit. */
function nameFrom(text: string): string {
  const sentence = /^(.+?[.!?])(\s|$)/.exec(text)?.[1] ?? text;
  return sentence.length <= NAME_MAX ? sentence : `${sentence.slice(0, NAME_MAX - 1).trimEnd()}…`;
}

function draftFromText(min: number, max: number, text: string): SurgeDraft {
  const [first, ...rest] = text.split("|").map((p) => p.trim());
  if (rest.length > 0) {
    return { roll_min: min, roll_max: max, name: first.slice(0, NAME_MAX), description: rest.join(" | ") || null, lasts_rounds: null };
  }
  const name = nameFrom(text);
  return { roll_min: min, roll_max: max, name, description: name === text ? null : text, lasts_rounds: null };
}

/**
 * Turns a pasted d100 table, one entry per line, into drafts. Lines that
 * don't start with a roll are reported rather than guessed at.
 */
export function parseSurgeLines(text: string): { drafts: SurgeDraft[]; skipped: number[] } {
  const drafts: SurgeDraft[] = [];
  const skipped: number[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const m = LINE.exec(line);
    const min = m ? readFace(m[1]) : NaN;
    const max = m?.[2] ? readFace(m[2]) : min;
    if (!m || min < 1 || max > 100 || min > max) {
      skipped.push(i + 1);
      return;
    }
    drafts.push(draftFromText(min, max, m[3]));
  });
  return { drafts, skipped };
}

/** Pairs of entries whose ranges overlap, so a roll would be ambiguous. */
export function findOverlaps(entries: Pick<SurgeEntry, "roll_min" | "roll_max" | "name">[]): [string, string][] {
  const ranged = entries
    .filter((e): e is typeof e & { roll_min: number; roll_max: number } => e.roll_min !== null && e.roll_max !== null)
    .sort((a, b) => a.roll_min - b.roll_min);
  const overlaps: [string, string][] = [];
  for (let i = 1; i < ranged.length; i++) {
    if (ranged[i].roll_min <= ranged[i - 1].roll_max) overlaps.push([ranged[i - 1].name, ranged[i].name]);
  }
  return overlaps;
}

/** How much of the d100 the table covers; uncovered rolls fall back to a random entry. */
export function coverage(entries: Pick<SurgeEntry, "roll_min" | "roll_max">[]): number {
  const covered = new Set<number>();
  for (const e of entries) {
    if (e.roll_min === null || e.roll_max === null) continue;
    for (let n = e.roll_min; n <= e.roll_max; n++) covered.add(n);
  }
  return covered.size;
}
