import { useState } from "react";
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

  function apply(sign: 1 | -1) {
    const value = Number(delta);
    if (!delta || isNaN(value) || value <= 0) return;
    onAdjust(sign * value);
    setDelta("");
  }

  const pct = max > 0 ? (current / max) * 100 : 0;
  const color =
    pct > 50 ? "bg-green-500" : pct > 25 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">
          {current} / {max} HP
        </span>
      </div>
      <Progress value={pct} className={`h-2 [&>div]:${color}`} />
      {canEdit && (
        <div className="flex items-center gap-1 mt-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 text-destructive"
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
            className="h-7 w-7 text-green-600"
            onClick={() => apply(1)}
          >
            +
          </Button>
        </div>
      )}
    </div>
  );
}
