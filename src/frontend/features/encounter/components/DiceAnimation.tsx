import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DiceRollBroadcast } from "../types/encounter.types";

type Phase = "rolling" | "result" | "done";

const DICE_COLORS: Record<string, string> = {
  d4:   "from-amber-500  to-amber-600",
  d6:   "from-blue-500   to-blue-600",
  d8:   "from-green-500  to-green-600",
  d10:  "from-purple-500 to-purple-600",
  d12:  "from-rose-500   to-rose-600",
  d20:  "from-primary    to-primary/80",
  d100: "from-slate-500  to-slate-600",
};

interface Props extends DiceRollBroadcast {
  onComplete: () => void;
}

export function DiceAnimation({ characterName, diceType, result, modifier, total, rollType, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("rolling");
  const [display, setDisplay] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sides = (() => {
    const m = diceType.match(/d(\d+)/i);
    return m ? parseInt(m[1]) : 20;
  })();

  const isCrit  = diceType === "d20" && result === 20;
  const isFumble = diceType === "d20" && result === 1;

  const gradient = DICE_COLORS[diceType] ?? DICE_COLORS.d20;

  useEffect(() => {
    // Cycle random numbers fast, then slow down
    let elapsed = 0;
    const tick = () => {
      elapsed += 70;
      setDisplay(Math.floor(Math.random() * sides) + 1);
    };
    intervalRef.current = setInterval(tick, 70);

    // Slow down
    const slowTimer = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(tick, 180);
    }, 800);

    // Stop and reveal result
    const stopTimer = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(result);
      setPhase("result");
    }, 1400);

    // Auto-dismiss
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 4500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(slowTimer);
      clearTimeout(stopTimer);
      clearTimeout(doneTimer);
    };
  }, [result, sides, onComplete]);

  if (phase === "done") return null;

  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  return (
    <div className="bg-card/96 backdrop-blur-md border shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-3 min-w-[200px]">
      {/* ── Die face ── */}
      <div
        className={cn(
          "relative h-28 w-28 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-inner",
          gradient,
          phase === "rolling" && "animate-bounce",
          isCrit   && phase === "result" && "ring-4 ring-yellow-400",
          isFumble && phase === "result" && "ring-4 ring-red-500",
        )}
      >
        <span
          className={cn(
            "text-5xl font-black tabular-nums select-none",
            phase === "rolling" ? "text-white/60" : "text-white drop-shadow-md",
          )}
        >
          {display}
        </span>
        {/* Die type badge */}
        <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-card border px-2 py-0.5 rounded-full text-foreground">
          {diceType}
        </span>
      </div>

      {/* ── Label ── */}
      <div className="text-center mt-2 space-y-0.5">
        <p className="text-sm font-semibold">{characterName}</p>
        <p className="text-xs text-muted-foreground">{rollType}</p>
      </div>

      {/* ── Result breakdown ── */}
      {phase === "result" && (
        <div className="w-full border-t pt-3 text-center space-y-1">
          {isCrit   && <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Critical Hit!</p>}
          {isFumble && <p className="text-xs font-bold text-red-500   uppercase tracking-widest">Critical Fail</p>}

          {modifier !== 0 && (
            <p className="text-sm text-muted-foreground">
              {result} {sign(modifier)}
            </p>
          )}

          <p className={cn(
            "text-5xl font-black",
            isCrit   ? "text-yellow-500" :
            isFumble ? "text-red-500"    :
            "text-foreground"
          )}>
            {total}
          </p>
        </div>
      )}
    </div>
  );
}
