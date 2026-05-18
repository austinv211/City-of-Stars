import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { cn } from "@/lib/utils";

const DICE_SIZES = [4, 6, 8, 10, 12, 20, 100] as const;
type DieSide = (typeof DICE_SIZES)[number];

type Pool = Partial<Record<DieSide, number>>;

interface Props {
  disabled?: boolean;
  onRoll: (opts: {
    pool: { sides: number; count: number }[];
    modifier: number;
    advantage: boolean;
    disadvantage: boolean;
    rollType: string;
  }) => void;
}

export function DicePoolBuilder({ disabled, onRoll }: Props) {
  const [pool, setPool] = useState<Pool>({});
  const [modifier, setModifier] = useState(0);
  const [adv, setAdv] = useState<"none" | "advantage" | "disadvantage">("none");

  const totalDice = Object.values(pool).reduce((s, c) => s + (c ?? 0), 0);
  // Adv/Dis only makes sense for exactly 1d20 — rolling 2d20 is two separate rolls
  const showAdvToggle = (pool[20] ?? 0) === 1;
  const isEmpty = totalDice === 0;

  function increment(sides: DieSide) {
    setPool((prev) => ({ ...prev, [sides]: (prev[sides] ?? 0) + 1 }));
  }

  function decrement(sides: DieSide) {
    setPool((prev) => {
      const next = (prev[sides] ?? 0) - 1;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[sides];
        return copy;
      }
      return { ...prev, [sides]: next };
    });
  }

  function clearPool() {
    setPool({});
    setModifier(0);
    setAdv("none");
  }

  function buildLabel() {
    const parts = DICE_SIZES.filter((s) => (pool[s] ?? 0) > 0).map(
      (s) => `${pool[s]}d${s}`
    );
    if (modifier > 0) parts.push(`+${modifier}`);
    if (modifier < 0) parts.push(String(modifier));
    if (adv === "advantage") parts.push("(Adv)");
    if (adv === "disadvantage") parts.push("(Dis)");
    return parts.join(" + ").replace(" + +", " + ") || "Roll";
  }

  function handleRoll() {
    const poolArr = DICE_SIZES.filter((s) => (pool[s] ?? 0) > 0).map((s) => ({
      sides: s,
      count: pool[s]!,
    }));
    onRoll({
      pool: poolArr,
      modifier,
      advantage: adv === "advantage",
      disadvantage: adv === "disadvantage",
      rollType: buildLabel(),
    });
    clearPool();
  }

  return (
    <div className="space-y-3">
      {/* Die buttons */}
      <div className="flex flex-wrap gap-1.5">
        {DICE_SIZES.map((sides) => {
          const count = pool[sides] ?? 0;
          return (
            <div key={sides} className="relative">
              <Button
                size="sm"
                variant={count > 0 ? "default" : "outline"}
                className="h-9 px-3 font-bold text-xs"
                disabled={disabled}
                onClick={() => increment(sides)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (count > 0) decrement(sides);
                }}
                title={count > 0 ? "Left-click to add, right-click to remove" : "Click to add"}
              >
                d{sides}
              </Button>
              {count > 0 && (
                <Badge
                  className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center text-[10px] px-1 pointer-events-none"
                  variant="secondary"
                >
                  {count}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Bonus + advantage row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Bonus</Label>
          <Input
            type="number"
            className="h-7 w-16 text-xs text-center"
            value={modifier}
            onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
            disabled={disabled}
          />
        </div>

        {showAdvToggle && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={adv === "advantage" ? "default" : "outline"}
              className={cn("h-7 text-xs px-2", adv === "advantage" && "bg-green-600 hover:bg-green-700")}
              disabled={disabled}
              onClick={() => setAdv((p) => p === "advantage" ? "none" : "advantage")}
            >
              Adv ▲
            </Button>
            <Button
              size="sm"
              variant={adv === "disadvantage" ? "default" : "outline"}
              className={cn("h-7 text-xs px-2", adv === "disadvantage" && "bg-red-600 hover:bg-red-700")}
              disabled={disabled}
              onClick={() => setAdv((p) => p === "disadvantage" ? "none" : "disadvantage")}
            >
              Dis ▽
            </Button>
          </div>
        )}

        {!isEmpty && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground ml-auto"
            onClick={clearPool}
            disabled={disabled}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Roll button */}
      <Button
        className="w-full"
        size="sm"
        disabled={disabled || isEmpty}
        onClick={handleRoll}
      >
        {isEmpty ? "Select dice above" : `Roll ${buildLabel()}`}
      </Button>
    </div>
  );
}
