import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Sparkles } from "lucide-react";
import type { CharacterSpellSlot } from "@/features/characters/types/character.types";

// Upcast picker + slot-expend control for a leveled spell, shown on its card in
// the encounter. `slots` and `onExpend` come from a single useSpellSlots in the
// parent so we don't open one realtime subscription per spell.
export function SpellSlotCast({
  minLevel,
  slots,
  disabled,
  onExpend,
}: {
  minLevel: number;
  slots: CharacterSpellSlot[];
  disabled: boolean;
  onExpend: (level: number) => void;
}) {
  const options = slots
    .filter((s) => s.spell_level >= minLevel && s.slots_total - s.slots_expended > 0)
    .sort((a, b) => a.spell_level - b.spell_level);
  const [picked, setPicked] = useState<number | null>(null);
  const level = picked ?? options[0]?.spell_level ?? null;

  if (slots.every((s) => s.slots_total === 0)) return null;
  if (options.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground">
        No spell slots available (level {minLevel}+)
      </p>
    );
  }
  return (
    <div className="flex gap-1.5">
      <Select
        value={level != null ? String(level) : undefined}
        onValueChange={(v) => setPicked(Number(v))}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 flex-1 text-xs">
          <SelectValue placeholder="Slot level" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem
              key={o.spell_level}
              value={String(o.spell_level)}
              className="text-xs"
            >
              L{o.spell_level} ({o.slots_total - o.slots_expended} left)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="default"
        className="h-8 flex-1 gap-1.5 text-xs"
        disabled={disabled || level == null}
        onClick={() => level != null && onExpend(level)}
        title={
          level != null && level > minLevel
            ? `Cast upcast at level ${level} (expends an L${level} slot)`
            : "Cast (expends a slot)"
        }
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        Cast{level != null && level > minLevel ? ` @L${level}` : ""}
      </Button>
    </div>
  );
}
