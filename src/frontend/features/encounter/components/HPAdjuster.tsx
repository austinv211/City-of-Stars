import { useState, useEffect, useRef } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Progress } from "@/core/components/ui/progress";

interface Props {
  current: number;
  max: number;
  canEdit: boolean;
  onAdjust: (delta: number) => void;
}

export function HPAdjuster({ current, max, canEdit, onAdjust }: Props) {
  const [delta, setDelta] = useState("");
  const prevRef = useRef(current);
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = current;
    if (current === prev) return;
    const cls = current < prev ? "hp-flash-damage" : "hp-flash-heal";
    setFlashClass(cls);
    const t = setTimeout(() => setFlashClass(""), 700);
    return () => clearTimeout(t);
  }, [current]);

  function apply(sign: 1 | -1) {
    const value = Number(delta);
    if (!delta || isNaN(value) || value <= 0) return;
    onAdjust(sign * value);
    setDelta("");
  }

  const pct = max > 0 ? (current / max) * 100 : 0;
  const barColor =
    pct > 50
      ? "[&>div]:bg-[hsl(var(--ctp-green))]"
      : pct > 25
        ? "[&>div]:bg-[hsl(var(--ctp-peach))]"
        : "[&>div]:bg-[hsl(var(--ctp-red))]";

  return (
    <div className={`space-y-1.5 ${flashClass}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {current} / {max} HP
        </span>
        <span
          className={
            pct > 50
              ? "text-xs text-ctp-green"
              : pct > 25
                ? "text-xs text-ctp-peach"
                : "text-xs text-ctp-red"
          }
        >
          {Math.round(pct)}%
        </span>
      </div>
      <Progress value={pct} className={`h-2 transition-all duration-500 ${barColor}`} />
      {canEdit && (
        <div className="flex items-center gap-1 mt-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 text-ctp-red border-[hsl(var(--ctp-red)/0.4)] hover:bg-[hsl(var(--ctp-red)/0.12)] hover:border-[hsl(var(--ctp-red)/0.6)]"
            onClick={() => apply(-1)}
          >
            −
          </Button>
          <Input
            type="number"
            min={0}
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply(1);
            }}
            placeholder="0"
            className="h-7 w-16 text-center text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 text-ctp-green border-[hsl(var(--ctp-green)/0.4)] hover:bg-[hsl(var(--ctp-green)/0.12)] hover:border-[hsl(var(--ctp-green)/0.6)]"
            onClick={() => apply(1)}
          >
            +
          </Button>
        </div>
      )}
    </div>
  );
}
