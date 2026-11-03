import type { EncounterParticipant } from "../types/encounter.types";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * What to call each combatant on screen and in the log.
 *
 * A nickname wins. Otherwise monsters sharing a stat-block name get letters
 * ("Goblin A", "Goblin B") so the log and the target picker can tell them
 * apart. Letters are assigned by id, not initiative, so a goblin keeps its
 * letter when the order is rolled or changes.
 *
 * The DM also sees what a nicknamed creature is: "Grizzle (Goblin)".
 */
export function labelParticipants(
  participants: EncounterParticipant[],
  viewerIsDM: boolean,
): Map<string, string> {
  const unnamed = participants.filter((p) => !p.is_player && !p.nickname);
  const groups = new Map<string, EncounterParticipant[]>();
  for (const p of unnamed) groups.set(p.name, [...(groups.get(p.name) ?? []), p]);

  const labels = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    [...group]
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((p, i) => labels.set(p.id, `${p.name} ${LETTERS[i] ?? String(i + 1)}`));
  }

  for (const p of participants) {
    if (p.nickname) {
      labels.set(p.id, viewerIsDM ? `${p.nickname} (${p.name})` : p.nickname);
    } else if (!labels.has(p.id)) {
      labels.set(p.id, p.name);
    }
  }
  return labels;
}

/** The participants with `name` replaced by their on-screen label. */
export function withLabels(
  participants: EncounterParticipant[],
  viewerIsDM: boolean,
): EncounterParticipant[] {
  const labels = labelParticipants(participants, viewerIsDM);
  return participants.map((p) => ({ ...p, name: labels.get(p.id) ?? p.name }));
}
