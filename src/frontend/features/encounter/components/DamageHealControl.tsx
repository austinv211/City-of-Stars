import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Swords } from "lucide-react";
import { DAMAGE_TYPES } from "@/features/characters/data/rules2024";
import type { EncounterParticipant } from "../types/encounter.types";
import type { DamageResult } from "../hooks/useEncounterParticipants";

interface Props {
  participant: EncounterParticipant;
  onApplyDamage: (amount: number, type: string | null, opts?: { crit?: boolean }) => Promise<DamageResult>;
  onHeal: (amount: number) => void;
  onSetConcentration?: (spell: string | null) => void;
}

// Typed damage / heal popover used on the participant cards and the character
// panel. Applies resistance/immunity/vulnerability + temp HP (in the hook) and
// raises a concentration-save prompt when a concentrating creature takes damage.
export function DamageHealControl({ participant, onApplyDamage, onHeal, onSetConcentration }: Props) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Slashing");
  const [crit, setCrit] = useState(false);
  const [concSave, setConcSave] = useState<{ dc: number; spell: string } | null>(null);

  async function apply(sign: 1 | -1) {
    const n = Number(amount);
    if (!n || n <= 0) return;
    if (sign === 1) {
      onHeal(n);
    } else {
      const res = await onApplyDamage(n, type, { crit });
      if (res.concentrationDC != null && participant.concentrating_on) {
        setConcSave({ dc: res.concentrationDC, spell: participant.concentrating_on });
      }
    }
    setAmount("");
    setCrit(false);
  }

  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 text-xs px-2 gap-1">
            <Swords className="h-3 w-3" /> Damage / Heal
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 space-y-2" align="start">
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") apply(-1); }}
            placeholder="Amount"
            className="h-7 text-sm"
            autoFocus
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAMAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={crit}
              onChange={(e) => setCrit(e.target.checked)}
              className="h-3 w-3"
            />
            Critical hit (2 death-save failures if target is at 0 HP)
          </label>
          <div className="flex gap-1.5">
            <Button size="sm" variant="destructive" className="h-7 flex-1 text-xs" onClick={() => apply(-1)}>Damage</Button>
            <Button size="sm" variant="secondary" className="h-7 flex-1 text-xs" onClick={() => apply(1)}>Heal</Button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Resistance/immunity/vulnerability and temp HP apply automatically.
          </p>
        </PopoverContent>
      </Popover>

      {concSave && (
        <div className="rounded-md border border-secondary/50 bg-secondary/10 p-2 text-xs space-y-1.5">
          <p>
            Concentration save <span className="font-semibold">DC {concSave.dc}</span> for{" "}
            <span className="font-medium">{concSave.spell}</span>
          </p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="destructive" className="h-6 text-xs flex-1" onClick={() => { onSetConcentration?.(null); setConcSave(null); }}>
              Failed — drop
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs flex-1" onClick={() => setConcSave(null)}>
              Kept
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
