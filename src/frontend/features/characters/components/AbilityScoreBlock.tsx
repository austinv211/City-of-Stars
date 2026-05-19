import { useState } from "react";
import { abilityModifier } from "../types/character.types";
import type { AbilityScores, AbilityName } from "../types/character.types";

const ABILITIES: { key: AbilityName; label: string }[] = [
  { key: "strength",     label: "STR" },
  { key: "dexterity",    label: "DEX" },
  { key: "constitution", label: "CON" },
  { key: "intelligence", label: "INT" },
  { key: "wisdom",       label: "WIS" },
  { key: "charisma",     label: "CHA" },
];

interface Props {
  scores: AbilityScores;
  canEdit?: boolean;
  onSave?: (ability: AbilityName, finalValue: number) => Promise<void>;
}

function ScoreCell({
  label, finalScore, canEdit, onSave,
}: {
  label: string;
  finalScore: number;
  canEdit: boolean;
  onSave: (v: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const displayed = draft ?? String(finalScore);
  const mod = abilityModifier(finalScore);

  async function commit() {
    const val = parseInt(displayed, 10);
    if (isNaN(val) || val === finalScore) {
      setDraft(null);
      return;
    }
    setSaving(true);
    await onSave(Math.max(1, Math.min(30, val)));
    setDraft(null);
    setSaving(false);
  }

  return (
    <div
      className={`rounded-lg border bg-card p-2 text-center transition-colors min-w-0 overflow-hidden ${
        canEdit ? "hover:border-primary/50 cursor-text" : ""
      }`}
    >
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      {canEdit ? (
        <input
          type="number"
          min={1}
          max={30}
          value={displayed}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => { setDraft(String(finalScore)); e.target.select(); }}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
          className="w-full min-w-0 text-center text-2xl font-bold mt-1 bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <div className="text-2xl font-bold mt-1">{finalScore}</div>
      )}
      <div className="text-xs text-muted-foreground font-mono">
        {mod >= 0 ? `+${mod}` : mod}
      </div>
    </div>
  );
}

export function AbilityScoreBlock({ scores, canEdit = false, onSave }: Props) {
  return (
    <div className="grid grid-cols-6 gap-2 text-center">
      {ABILITIES.map(({ key, label }) => (
        <ScoreCell
          key={key}
          label={label}
          finalScore={scores[key]}
          canEdit={canEdit}
          onSave={(v) => onSave ? onSave(key, v) : Promise.resolve()}
        />
      ))}
    </div>
  );
}
