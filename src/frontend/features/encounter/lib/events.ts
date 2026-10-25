import type { EncounterParticipant } from "../types/encounter.types";

/**
 * The encounter event log (encounter_events), read side: what each event
 * means in a sentence, and whether and how it can be undone.
 *
 * Events are written by database triggers with exact before/after snapshots
 * of the columns that changed, so undo is "write `before` back" -- no
 * inverse operations to get wrong.
 */

export type EventKind =
  | "damage"
  | "heal"
  | "death_save"
  | "condition"
  | "concentration"
  | "status"
  | "turn"
  | "effect_added"
  | "effect_removed";

type Snapshot = Partial<Record<string, unknown>>;

export interface EncounterEvent {
  id: number;
  encounter_id: string;
  actor_id: string | null;
  round: number | null;
  kind: EventKind;
  participant_id: string | null;
  payload: {
    name?: string;
    before?: Snapshot;
    after?: Snapshot;
    effect?: { name?: string };
    wrapped?: boolean;
  };
  created_at: string;
}

const PARTICIPANT_KINDS: ReadonlySet<EventKind> = new Set([
  "damage",
  "heal",
  "death_save",
  "condition",
  "concentration",
  "status",
]);

interface DescribeCtx {
  e: EncounterEvent;
  who: string;
  before: Snapshot;
  after: Snapshot;
  nameOf: (id: string | null) => string;
}

function describeHp({ e, who, before, after }: DescribeCtx): string {
  const hp = hpChange(before, after);
  const verb = e.kind === "damage" ? "took" : "regained";
  return hp === null ? `${who}: HP changed` : `${who} ${verb} ${String(Math.abs(hp))}`;
}

const DESCRIBE: Record<EventKind, (c: DescribeCtx) => string> = {
  damage: describeHp,
  heal: describeHp,
  condition: ({ who, before, after }) =>
    `${who}: ${conditionChange(before.conditions, after.conditions)}`,
  death_save: ({ who, after }) => `${who}: death saves ${fmtSaves(after)}`,
  concentration: ({ who, after }) =>
    typeof after.concentrating_on === "string"
      ? `${who} concentrates on ${after.concentrating_on}`
      : `${who} lost concentration`,
  status: ({ who, after }) =>
    `${who}: ${Object.keys(after).join(", ").replace(/_/g, " ")} changed`,
  turn: ({ e, who }) =>
    e.payload.wrapped ? `Round ${String(e.round)} begins` : `${who}'s turn`,
  effect_added: ({ e, nameOf }) =>
    `${e.payload.effect?.name ?? "Effect"} on ${nameOf(e.participant_id)}`,
  effect_removed: ({ e, nameOf }) =>
    `${e.payload.effect?.name ?? "Effect"} ended on ${nameOf(e.participant_id)}`,
};

/** One line for the history list. */
export function describeEvent(
  e: EncounterEvent,
  nameOf: (id: string | null) => string,
): string {
  return DESCRIBE[e.kind]({
    e,
    who: e.payload.name ?? nameOf(e.participant_id),
    before: e.payload.before ?? {},
    after: e.payload.after ?? {},
    nameOf,
  });
}

/** HP + temp HP lost (negative) or gained (positive), or null if neither moved. */
function hpChange(before: Snapshot, after: Snapshot): number | null {
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  if (!("hp_current" in after) && !("hp_temp" in after)) return null;
  const pick = (s: Snapshot, other: Snapshot, k: string) =>
    k in s ? num(s[k]) : num(other[k]);
  const b = pick(before, after, "hp_current") + pick(before, after, "hp_temp");
  const a = pick(after, before, "hp_current") + pick(after, before, "hp_temp");
  return a - b;
}

function conditionChange(before: unknown, after: unknown): string {
  const b = new Set(Array.isArray(before) ? (before as string[]) : []);
  const a = new Set(Array.isArray(after) ? (after as string[]) : []);
  const added = [...a].filter((c) => !b.has(c));
  const removed = [...b].filter((c) => !a.has(c));
  return (
    [...added.map((c) => `${c} added`), ...removed.map((c) => `${c} removed`)].join(
      ", ",
    ) || "conditions changed"
  );
}

function fmtSaves(s: Snapshot): string {
  const n = (v: unknown) => (typeof v === "number" ? v : 0);
  return `${String(n(s.death_save_successes))}✓ ${String(n(s.death_save_failures))}✗`;
}

export type UndoState = { ok: true; patch: Snapshot } | { ok: false; reason: string };

/**
 * Can this event be undone right now, and with what update?
 *
 * Only participant changes are undoable. And only while the combatant still
 * looks the way the event left it: if anything it touched has changed since,
 * writing `before` back would silently discard that later change too.
 */
export function undoState(
  e: EncounterEvent,
  current: EncounterParticipant | undefined,
): UndoState {
  if (!PARTICIPANT_KINDS.has(e.kind)) return { ok: false, reason: "Not undoable" };
  if (!current) return { ok: false, reason: "No longer in the encounter" };
  const before = e.payload.before ?? {};
  const after = e.payload.after ?? {};
  const now = current as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(after)) {
    if (JSON.stringify(now[k]) !== JSON.stringify(v)) {
      return { ok: false, reason: "Changed since" };
    }
  }
  return { ok: true, patch: before };
}
