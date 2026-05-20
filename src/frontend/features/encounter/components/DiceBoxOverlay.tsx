import { useEffect } from "react";
import "@3d-dice/dice-box/dist/style.css";
import { useDice } from "../context/DiceContext";
import { cn } from "@/lib/utils";
import type { DiceRollBroadcast } from "../types/encounter.types";

const DISMISS_MS = 2500;

function parseSides(diceType: string): number {
  const m = diceType.match(/d(\d+)/i);
  return m ? parseInt(m[1]) : 20;
}

const DICE_COLOR: Record<string, string> = {
  d4: "#f59e0b",
  d6: "#3b82f6",
  d8: "#22c55e",
  d10: "#a855f7",
  d12: "#f43f5e",
  d20: "#6366f1",
  d100: "#64748b",
};

// ── Result card ────────────────────────────────────────────────────────────

function ResultCard({ current }: { current: DiceRollBroadcast }) {
  const {
    diceType,
    result,
    modifier,
    total,
    rollType,
    characterName,
    advantage,
    disadvantage,
    discardedRoll,
    rolls,
  } = current;
  const firstDie = diceType.split("+")[0]?.trim() ?? "d20";
  const accentColor = DICE_COLOR[firstDie] ?? DICE_COLOR.d20;
  const sides = parseSides(diceType);
  const isCrit = sides === 20 && result === 20;
  const isFumble = sides === 20 && result === 1;
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  const hasBreakdown = (rolls && rolls.length > 1) || modifier !== 0;

  return (
    <div className="bg-card/95 backdrop-blur-md border shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-3 min-w-[220px] max-w-[320px]">
      <div
        className={cn(
          "h-24 w-24 rounded-2xl flex items-center justify-center shadow-inner",
          isCrit && "ring-4 ring-yellow-400",
          isFumble && "ring-4 ring-red-500",
        )}
        style={{
          background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}77)`,
        }}
      >
        <span className="text-5xl font-black tabular-nums select-none text-white drop-shadow-md">
          {total}
        </span>
      </div>
      <span className="text-xs font-bold bg-card border px-2 py-0.5 rounded-full text-foreground -mt-5">
        {diceType}
      </span>

      <div className="text-center space-y-0.5">
        <p className="text-sm font-semibold">{characterName}</p>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          {rollType}
          {advantage && (
            <span className="text-green-500 font-bold text-[10px] uppercase">ADV</span>
          )}
          {disadvantage && (
            <span className="text-red-400 font-bold text-[10px] uppercase">DIS</span>
          )}
        </p>
      </div>

      <div className="w-full border-t pt-3 text-center space-y-2">
        {isCrit && (
          <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest">
            Critical Hit!
          </p>
        )}
        {isFumble && (
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest">
            Critical Fail
          </p>
        )}

        {/* Individual die chips */}
        {rolls && rolls.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {rolls.map((v, i) => (
              <span
                key={i}
                className="text-xs font-bold bg-muted rounded px-2 py-0.5 tabular-nums"
              >
                {v}
              </span>
            ))}
            {discardedRoll !== undefined && (
              <span className="text-xs font-bold bg-muted/40 rounded px-2 py-0.5 tabular-nums line-through text-muted-foreground">
                {discardedRoll}
              </span>
            )}
          </div>
        )}

        {/* Breakdown: e.g. "4 + 6 + 3 = 13" */}
        {hasBreakdown && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {rolls && rolls.length > 1
              ? rolls.join(" + ")
              : result}
            {modifier !== 0 && (
              <span> {sign(modifier)}</span>
            )}
            <span className="text-foreground font-semibold"> = {total}</span>
          </p>
        )}

        {/* Show total as large number only when there's no breakdown */}
        {!hasBreakdown && (
          <p
            className={cn(
              "text-4xl font-black",
              isCrit ? "text-yellow-500" : isFumble ? "text-red-500" : "text-foreground",
            )}
          >
            {total}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Overlay ────────────────────────────────────────────────────────────────

export function DiceBoxOverlay() {
  const { animQueue, shiftAnim, diceAnimating, clearDiceAnimation } = useDice();
  const current = animQueue[0] ?? null;

  // Auto-dismiss after DISMISS_MS once a roll result appears in the queue.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      clearDiceAnimation();
      shiftAnim();
    }, DISMISS_MS);
    return () => clearTimeout(t);
  }, [current, shiftAnim, clearDiceAnimation]);

  // Layer order:
  //   48 — dark backdrop
  //   49 — dice canvas (DiceBox appends its canvas here)
  //   50 — result card anchored center
  //
  // #dice-box-container must stay at a stable tree position — a root-type
  // change (div ↔ Fragment) unmounts it and detaches Babylon.js's canvas.
  return (
    <>
      {diceAnimating && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            zIndex: 48,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}
      <div
        id="dice-box-container"
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 49, opacity: diceAnimating ? 1 : 0 }}
      />
      {current && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 50 }}
        >
          <ResultCard current={current} />
        </div>
      )}
    </>
  );
}
