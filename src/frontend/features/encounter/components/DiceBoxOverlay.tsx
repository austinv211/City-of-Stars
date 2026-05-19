import { useEffect, useRef, useState } from "react";
import DiceBox from "@3d-dice/dice-box";
import "@3d-dice/dice-box/dist/style.css";
import { useDice } from "../context/DiceContext";
import { cn } from "@/lib/utils";
import type { DiceRollBroadcast } from "../types/encounter.types";

const RESULT_DELAY_MS = 1800;
const DISMISS_MS = 5000;

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

// ── Flickering number ──────────────────────────────────────────────────────

function FlickeringNumber({ sides, size = "4xl" }: { sides: number; size?: string }) {
  const [n, setN] = useState(() => Math.floor(Math.random() * sides) + 1);
  useEffect(() => {
    const id = setInterval(
      () => setN(Math.floor(Math.random() * sides) + 1),
      75,
    );
    return () => clearInterval(id);
  }, [sides]);
  return (
    <span className={`text-${size} font-black tabular-nums select-none text-white drop-shadow-lg leading-none`}>
      {n}
    </span>
  );
}

// ── Single bouncing die ────────────────────────────────────────────────────

interface DiePiece {
  size: number;       // px
  top: string;
  left: string;
  animDuration: string;
  animDelay: string;
  spinDuration: string;
  spinDelay: string;
  zOffset: number;
}

function BouncingDie({
  sides,
  accentColor,
  piece,
  label,
}: {
  sides: number;
  accentColor: string;
  piece: DiePiece;
  label?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: piece.top,
        left: piece.left,
        width: piece.size,
        height: piece.size,
        zIndex: 50 + piece.zOffset,
        animation: `die-bounce ${piece.animDuration} ${piece.animDelay} ease-in-out infinite`,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: piece.size * 0.22,
          background: `linear-gradient(145deg, ${accentColor}ff, ${accentColor}99)`,
          boxShadow: `0 8px 32px ${accentColor}66, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          animation: `die-spin ${piece.spinDuration} ${piece.spinDelay} linear infinite`,
          gap: 2,
        }}
      >
        <FlickeringNumber sides={sides} size={piece.size >= 100 ? "5xl" : piece.size >= 72 ? "3xl" : "xl"} />
        {label && (
          <span
            style={{
              fontSize: piece.size * 0.13,
              fontWeight: 700,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Die cluster ────────────────────────────────────────────────────────────

const PIECES: DiePiece[] = [
  // center — large, slow bounce, fast spin
  { size: 112, top: "calc(50% - 56px)", left: "calc(50% - 56px)", animDuration: "0.55s", animDelay: "0s",     spinDuration: "0.45s", spinDelay: "0s",     zOffset: 5 },
  // upper-left
  { size: 72,  top: "18%",             left: "22%",              animDuration: "0.42s", animDelay: "-0.15s",  spinDuration: "0.38s", spinDelay: "-0.2s",  zOffset: 3 },
  // upper-right
  { size: 64,  top: "15%",             left: "62%",              animDuration: "0.48s", animDelay: "-0.30s",  spinDuration: "0.42s", spinDelay: "-0.1s",  zOffset: 3 },
  // lower-left
  { size: 56,  top: "62%",             left: "18%",              animDuration: "0.38s", animDelay: "-0.08s",  spinDuration: "0.35s", spinDelay: "-0.35s", zOffset: 2 },
  // lower-right
  { size: 68,  top: "58%",             left: "66%",              animDuration: "0.44s", animDelay: "-0.22s",  spinDuration: "0.40s", spinDelay: "-0.15s", zOffset: 4 },
  // far-left mid
  { size: 48,  top: "40%",             left: "8%",               animDuration: "0.36s", animDelay: "-0.12s",  spinDuration: "0.32s", spinDelay: "-0.05s", zOffset: 2 },
  // far-right mid
  { size: 52,  top: "35%",             left: "82%",              animDuration: "0.40s", animDelay: "-0.25s",  spinDuration: "0.36s", spinDelay: "-0.28s", zOffset: 2 },
];

function DiceCluster({ sides, accentColor, diceType }: { sides: number; accentColor: string; diceType: string }) {
  return (
    <>
      <style>{`
        @keyframes die-bounce {
          0%, 100% { transform: translateY(0px)   scale(1);    }
          20%       { transform: translateY(-28px) scale(1.08); }
          35%       { transform: translateY(-10px) scale(0.96); }
          55%       { transform: translateY(-22px) scale(1.05); }
          70%       { transform: translateY(-4px)  scale(0.98); }
          85%       { transform: translateY(-14px) scale(1.03); }
        }
        @keyframes die-spin {
          0%   { transform: rotate(0deg);   }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      {PIECES.map((piece, i) => (
        <BouncingDie
          key={i}
          sides={sides}
          accentColor={accentColor}
          piece={piece}
          label={i === 0 ? diceType : undefined}
        />
      ))}
    </>
  );
}

// ── Result card ────────────────────────────────────────────────────────────

function ResultCard({ current, visible }: { current: DiceRollBroadcast; visible: boolean }) {
  const { diceType, result, modifier, total, rollType, characterName, advantage, disadvantage } = current;
  const firstDie = diceType.split("+")[0]?.trim() ?? "d20";
  const accentColor = DICE_COLOR[firstDie] ?? DICE_COLOR.d20;
  const sides = parseSides(diceType);
  const isCrit = sides === 20 && result === 20;
  const isFumble = sides === 20 && result === 1;
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  return (
    <div
      className={cn(
        "bg-card/95 backdrop-blur-md border shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-3 min-w-[200px] z-10",
        "transition-all duration-500",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none",
      )}
    >
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
  const [showResult, setShowResult] = useState(false);
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
    setShowResult(false);
    tryDiceBox(parseSides(current.diceType));
    const t1 = setTimeout(() => setShowResult(true), RESULT_DELAY_MS);
    const t2 = setTimeout(() => {
      setVisible(false);
      setShowResult(false);
      boxRef.current?.clear();
      shiftAnim();
    }, DISMISS_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [current, shiftAnim]);

  if (!visible || !current) {
    return <div id="dice-box-container" className="fixed inset-0 pointer-events-none" style={{ zIndex: 48, opacity: 0 }} />;
  }

  const firstDie = current.diceType.split("+")[0]?.trim() ?? "d20";
  const accentColor = DICE_COLOR[firstDie] ?? DICE_COLOR.d20;
  const sides = parseSides(current.diceType);

  return (
    <>
      <div id="dice-box-container" className="fixed inset-0 pointer-events-none" style={{ zIndex: 48 }} />

      {/* Full-screen overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 49, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)" }}
      >
        {/* Flying dice cluster — fades out as result appears */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transition: "opacity 0.4s ease, transform 0.4s ease",
            opacity: showResult ? 0 : 1,
            transform: showResult ? "scale(0.85)" : "scale(1)",
          }}
        >
          <DiceCluster sides={sides} accentColor={accentColor} diceType={firstDie} />
        </div>

        {/* Result card — centered, fades in */}
        <div className="absolute inset-0 flex items-center justify-center">
          <ResultCard current={current} visible={showResult} />
        </div>
      </div>
    </>
  );
}
