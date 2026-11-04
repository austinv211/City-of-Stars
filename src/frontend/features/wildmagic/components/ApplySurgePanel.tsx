import { useState } from "react";
import { Dices, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { applySurge, type SurgeTarget } from "../hooks/useSurgeLog";
import { formatRange, type SurgeEntry } from "../lib/surgeTable";

const ROLL = "__roll__";

interface Props {
  targets: SurgeTarget[];
  entries: SurgeEntry[];
}

/**
 * Point the surge at a character, then roll on the table or pick an entry.
 * A physical roll from the table can be typed in instead of rolling here.
 */
export function ApplySurgePanel({ targets, entries }: Props) {
  const [targetId, setTargetId] = useState<string>("");
  const [choice, setChoice] = useState<string>(ROLL);
  const [tableRoll, setTableRoll] = useState("");
  const [busy, setBusy] = useState(false);

  const target = targets.find((t) => t.id === targetId) ?? (targets.length === 1 ? targets[0] : undefined);
  const rolled = Number(tableRoll);
  const validRoll = tableRoll === "" || (Number.isInteger(rolled) && rolled >= 1 && rolled <= 100);

  async function handleApply() {
    if (!target) return;
    setBusy(true);
    const pick = choice === ROLL ? { roll: tableRoll ? rolled : undefined } : { surgeId: choice };
    const { surge, error } = await applySurge(target.id, pick);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    setTableRoll("");
    toast.success(`${target.name}: ${surge?.name ?? "surge"}`, {
      description: surge?.roll != null ? `Rolled ${String(surge.roll)}` : undefined,
    });
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Add some surges to the table first.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="surge-target">Who surges?</Label>
        <Select value={target?.id ?? ""} onValueChange={setTargetId}>
          <SelectTrigger id="surge-target">
            <SelectValue placeholder="Choose a character" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="surge-choice">Which surge?</Label>
        <Select value={choice} onValueChange={setChoice}>
          <SelectTrigger id="surge-choice">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROLL}>Roll d100 on the table</SelectItem>
            {entries.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {formatRange(e.roll_min, e.roll_max)} · {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {choice === ROLL && (
        <div className="space-y-1.5">
          <Label htmlFor="surge-table-roll">Rolled it at the table? (optional)</Label>
          <Input
            id="surge-table-roll"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={tableRoll}
            onChange={(e) => setTableRoll(e.target.value)}
            placeholder="Leave empty to roll here"
          />
        </div>
      )}

      <Button className="w-full" disabled={!target || busy || !validRoll} onClick={() => void handleApply()}>
        {choice === ROLL && !tableRoll ? <Dices className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {busy ? "Surging…" : "Unleash the surge"}
      </Button>
    </div>
  );
}
