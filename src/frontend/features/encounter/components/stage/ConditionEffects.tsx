import type { CombatantStats } from "./combatantStats";

/** The 2024 condition and exhaustion effects currently auto-applied to rolls. */
export function ConditionEffects({ stats }: { stats: CombatantStats }) {
  const { condEffects, exhaustionLevel, exhaustPenalty } = stats;
  if (condEffects.notes.length === 0 && exhaustionLevel === 0) return null;

  return (
    <div className="space-y-1 rounded-md border border-secondary/40 bg-secondary/10 p-2 text-xs">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
        Active Effects (auto-applied to rolls)
      </p>
      {exhaustionLevel > 0 && (
        <p>
          <span className="font-medium text-destructive">
            Exhaustion {exhaustionLevel}:
          </span>{" "}
          {exhaustPenalty} to all d20 tests, {-5 * exhaustionLevel} ft speed.
        </p>
      )}
      {condEffects.incapacitated && (
        <p className="font-medium text-destructive">
          Incapacitated — no action, bonus action, or reaction this turn.
        </p>
      )}
      {condEffects.autoFailStrDexSaves && (
        <p className="text-destructive">
          STR and DEX saving throws automatically fail.
        </p>
      )}
      {condEffects.notes.map((n) => (
        <p key={n.condition}>
          <span className="font-medium">{n.condition}:</span> {n.note}
        </p>
      ))}
    </div>
  );
}
