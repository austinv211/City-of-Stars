import { useState } from "react";
import { Separator } from "@/core/components/ui/separator";
import type { DerivedStats } from "../types/character.types";

interface EditableCellProps {
  label: string;
  value: string;
  onSave: (raw: string) => Promise<void>;
}

function EditableCell({ label, value, onSave }: EditableCellProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const displayed = draft ?? value;

  async function commit() {
    if (draft === null || draft === value) { setDraft(null); return; }
    setSaving(true);
    await onSave(draft);
    setDraft(null);
    setSaving(false);
  }

  return (
    <div className="text-center shrink-0 cursor-text" title="Click to edit">
      <div className="text-xs text-muted-foreground whitespace-nowrap">{label}</div>
      <input
        type="number"
        min={0}
        value={displayed}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => { setDraft(value); e.target.select(); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className="w-14 text-center text-xl font-bold bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none hover:bg-muted/40 transition-colors"
      />
    </div>
  );
}

function StaticCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center shrink-0">
      <div className="text-xs text-muted-foreground whitespace-nowrap">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

interface Props {
  derived: DerivedStats;
  ac?: number | null;
  speed?: number | null;
  level?: number;
  passiveInvestigation?: number;
  passiveInsight?: number;
  canEdit?: boolean;
  onSaveAC?: (v: number) => Promise<void>;
  onSaveSpeed?: (v: number) => Promise<void>;
  onSaveLevel?: (v: number) => Promise<void>;
}

export function DerivedStatsBar({
  derived, ac, speed, level, passiveInvestigation, passiveInsight,
  canEdit = false, onSaveAC, onSaveSpeed, onSaveLevel,
}: Props) {
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  const parseAndSave = (fn?: (v: number) => Promise<void>, min = 0) =>
    async (raw: string) => {
      const v = parseInt(raw, 10);
      if (!isNaN(v) && fn) await fn(Math.max(min, v));
    };

  const cells: { label: string; node: React.ReactNode }[] = [
    {
      label: "Prof. Bonus",
      node: <StaticCell label="Prof. Bonus" value={sign(derived.proficiencyBonus)} />,
    },
    {
      label: "Initiative",
      node: <StaticCell label="Initiative" value={sign(derived.initiative)} />,
    },
    ...(ac != null
      ? [{
          label: "AC",
          node: canEdit && onSaveAC
            ? <EditableCell label="AC" value={String(ac)} onSave={parseAndSave(onSaveAC, 0)} />
            : <StaticCell label="AC" value={String(ac)} />,
        }]
      : []),
    ...(speed != null
      ? [{
          label: "Speed",
          node: canEdit && onSaveSpeed
            ? <EditableCell label="Speed" value={String(speed)} onSave={parseAndSave(onSaveSpeed, 0)} />
            : <StaticCell label="Speed" value={`${speed} ft`} />,
        }]
      : []),
    ...(level != null
      ? [{
          label: "Level",
          node: canEdit && onSaveLevel
            ? <EditableCell label="Level" value={String(level)} onSave={parseAndSave(onSaveLevel, 1)} />
            : <StaticCell label="Level" value={String(level)} />,
        }]
      : []),
    {
      label: "Passive Perc.",
      node: <StaticCell label="Passive Perc." value={String(derived.passivePerception)} />,
    },
    ...(passiveInvestigation != null
      ? [{ label: "Pass. Invest.", node: <StaticCell label="Pass. Invest." value={String(passiveInvestigation)} /> }]
      : []),
    ...(passiveInsight != null
      ? [{ label: "Pass. Insight", node: <StaticCell label="Pass. Insight" value={String(passiveInsight)} /> }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-around gap-y-2 rounded-lg border bg-muted/40 px-4 py-3">
      {cells.map(({ label, node }, i) => (
        <div key={label} className="flex items-center gap-4">
          {node}
          {i < cells.length - 1 && (
            <Separator orientation="vertical" className="h-8 hidden sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}
