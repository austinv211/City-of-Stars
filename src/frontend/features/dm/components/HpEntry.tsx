import { Minus, Plus } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { cn } from "@/lib/utils";
import { clampHp } from "../lib/hp";

/**
 * Starting HP for a character entering combat: never above their max, with
 * steppers and a one-tap "Full" for the usual case.
 */
export function HpEntry({
  label,
  value,
  max,
  onChange,
  disabled = false,
}: {
  /** Accessible name, e.g. "Isolde starting HP". */
  label: string;
  value: number;
  max: number;
  onChange: (hp: number) => void;
  disabled?: boolean;
}) {
  const set = (hp: number) => {
    onChange(clampHp(hp, max));
  };
  const full = value >= max;

  return (
    <div className={cn("flex items-center gap-1", disabled && "opacity-50")}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        aria-label={`${label}: one less`}
        disabled={disabled || value <= 0}
        onClick={() => {
          set(value - 1);
        }}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          set(Number(e.target.value));
        }}
        className="h-8 w-14 px-1 text-center"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        aria-label={`${label}: one more`}
        disabled={disabled || full}
        onClick={() => {
          set(value + 1);
        }}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <span className="shrink-0 text-xs text-muted-foreground">/ {max}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-1 h-7 px-2 text-xs"
        disabled={disabled || full}
        onClick={() => {
          set(max);
        }}
      >
        Full
      </Button>
    </div>
  );
}
