import { useEffect, useRef, useState } from "react";
import DiceBox from "@3d-dice/dice-box";
import "@3d-dice/dice-box/dist/style.css";
import { useDice } from "../context/DiceContext";
import { cn } from "@/lib/utils";
import type { DiceRollBroadcast } from "../types/encounter.types";

const DISMISS_MS = 4000;

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
  const { diceType, result, modifier, total, rollType, characterName, advantage, disadvantage } = current;
  const firstDie = diceType.split("+")[0]?.trim() ?? "d20";
  const accentColor = DICE_COLOR[firstDie] ?? DICE_COLOR.d20;
  const sides = parseSides(diceType);
  const isCrit = sides === 20 && result === 20;
  const isFumble = sides === 20 && result === 1;
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  return (
    <div className="bg-card/95 backdrop-blur-md border shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-3 min-w-[200px]">
      <div
        className={cn(
          "h-24 w-24 rounded-2xl flex items-center justify-center shadow-inner",
          isCrit && "ring-4 ring-yellow-400",
          isFumble && "ring-4 ring-red-500",
        )}
        style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}77)` }}
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
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {rollType}
          {advantage && <span className="text-green-500 font-bold text-[10px] uppercase">ADV</span>}
          {disadvantage && <span className="text-red-400 font-bold text-[10px] uppercase">DIS</span>}
        </p>
      </div>

      <div className="w-full border-t pt-3 text-center space-y-1">
        {isCrit && <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Critical Hit!</p>}
        {isFumble && <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Critical Fail</p>}
        {modifier !== 0 && (
          <p className="text-sm text-muted-foreground">
            {result} {sign(modifier)}
          </p>
        )}
        <p className={cn("text-4xl font-black", isCrit ? "text-yellow-500" : isFumble ? "text-red-500" : "text-foreground")}>
          {total}
        </p>
      </div>
    </div>
  );
}

// ── Overlay ────────────────────────────────────────────────────────────────

export function DiceBoxOverlay() {
  const { animQueue, shiftAnim } = useDice();
  const current = animQueue[0] ?? null;

  const boxRef = useRef<InstanceType<typeof DiceBox> | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const [visible, setVisible] = useState(false);

  function tryDiceBox(sides: number) {
    if (!initPromiseRef.current) {
      try {
        const box = new DiceBox({
          assetPath: "/assets/dice-box/",
          selector: "#dice-box-container",
          id: "dice-box-canvas",
          offscreen: false,
          theme: "default",
          themeColor: "#6366f1",
          scale: 7,
          gravity: 1,
          mass: 1,
          friction: 0.8,
          restitution: 0.3,
          angularDamping: 0.4,
          linearDamping: 0.4,
          spinForce: 4,
          throwForce: 4,
          startingHeight: 12,
          settleTimeout: 5000,
        } as ConstructorParameters<typeof DiceBox>[0]);
        initPromiseRef.current = box.init().then(() => { boxRef.current = box; }).catch(() => {});
      } catch { return; }
    }
    initPromiseRef.current
      .then(() => boxRef.current?.clear())
      .then(() => boxRef.current?.roll(`1d${sides}`))
      .catch(() => {});
  }

  useEffect(() => {
    if (!current) return;
    setVisible(true);
    tryDiceBox(parseSides(current.diceType));
    const t = setTimeout(() => {
      setVisible(false);
      boxRef.current?.clear();
      shiftAnim();
    }, DISMISS_MS);
    return () => clearTimeout(t);
  }, [current, shiftAnim]);

  if (!visible || !current) {
    return <div id="dice-box-container" className="fixed inset-0 pointer-events-none" style={{ zIndex: 48, opacity: 0 }} />;
  }

  return (
    <>
      <div id="dice-box-container" className="fixed inset-0 pointer-events-none" style={{ zIndex: 48 }} />
      <div
        className="fixed inset-0 pointer-events-none flex items-center justify-center"
        style={{ zIndex: 49, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)" }}
      >
        <ResultCard current={current} />
      </div>
    </>
  );
}
