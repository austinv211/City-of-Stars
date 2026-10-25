import type { EffectExpiry, EncounterEffect } from "../types/encounter.types";

/** The choices offered when adding an effect, in the order a DM reaches for them. */
export const EXPIRY_OPTIONS: {
  value: EffectExpiry;
  label: string;
  needsSource: boolean;
}[] = [
  { value: "rounds", label: "For a number of rounds", needsSource: false },
  {
    value: "end_of_target_next_turn",
    label: "Until the end of the target's next turn",
    needsSource: false,
  },
  {
    value: "start_of_source_next_turn",
    label: "Until the start of the source's next turn",
    needsSource: true,
  },
  {
    value: "end_of_source_next_turn",
    label: "Until the end of the source's next turn",
    needsSource: true,
  },
  { value: "concentration", label: "While the source concentrates", needsSource: true },
  { value: "manual", label: "Until removed", needsSource: false },
];

/**
 * How long an effect lasts, as a short phrase for a chip: "2 rounds",
 * "until Lyra's next turn", "Lyra's concentration".
 *
 * `nameOf` resolves a combatant id to a display name and should return
 * "you"/"your" forms itself when the id is the viewer's.
 */
export function describeExpiry(
  e: Pick<
    EncounterEffect,
    "expiry" | "rounds_remaining" | "source_participant_id" | "target_participant_id"
  >,
  nameOf: (participantId: string | null) => string,
): string {
  const source = nameOf(e.source_participant_id);
  const target = nameOf(e.target_participant_id);
  switch (e.expiry) {
    case "rounds": {
      const n = e.rounds_remaining ?? 0;
      return n === 1 ? "1 round" : `${String(n)} rounds`;
    }
    case "start_of_source_next_turn":
      return `until ${possessive(source)} next turn`;
    case "end_of_source_next_turn":
      return `until end of ${possessive(source)} next turn`;
    case "end_of_target_next_turn":
      return `until end of ${possessive(target)} next turn`;
    case "concentration":
      return `${possessive(source)} concentration`;
    case "manual":
      return "until removed";
  }
}

/** "Lyra" -> "Lyra's", "you" -> "your", "Ness" -> "Ness'". */
export function possessive(name: string): string {
  if (name.toLowerCase() === "you") return name === "You" ? "Your" : "your";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}
