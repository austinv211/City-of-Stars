import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DiceRollBroadcast } from "../types/encounter.types";

type Phase = "rolling" | "result" | "done";

// Icosahedron: φ = golden ratio, 12 vertices, 20 faces
const PHI = (1 + Math.sqrt(5)) / 2;
const RAW_VERTS: [number, number, number][] = [
  [0, 1, PHI], [0, -1, PHI], [0, 1, -PHI], [0, -1, -PHI],
  [1, PHI, 0], [-1, PHI, 0], [1, -PHI, 0], [-1, -PHI, 0],
  [PHI, 0, 1], [-PHI, 0, 1], [PHI, 0, -1], [-PHI, 0, -1],
];
// Normalize to unit sphere
const VERTS = RAW_VERTS.map(([x, y, z]) => {
  const m = Math.sqrt(x * x + y * y + z * z);
  return [x / m, y / m, z / m] as [number, number, number];
});
const FACES: [number, number, number][] = [
  [0,1,8],[0,8,4],[0,4,5],[0,5,9],[0,9,1],       // top cap
  [1,6,8],[8,6,10],[8,10,4],[4,10,2],[4,2,5],     // upper belt
  [5,2,11],[5,11,9],[9,11,7],[9,7,1],[1,7,6],     // lower belt
  [3,6,7],[3,7,11],[3,11,2],[3,2,10],[3,10,6],    // bottom cap
];
// Lighting direction (normalized)
const LM = Math.sqrt(0.09 + 0.49 + 0.49);
const LIGHT: [number, number, number] = [-0.3 / LM, -0.7 / LM, 0.7 / LM];

// Per-dice accent colors (match existing DICE_COLORS theme)
const DICE_COLOR: Record<string, string> = {
  d4: "#f59e0b", d6: "#3b82f6", d8: "#22c55e",
  d10: "#a855f7", d12: "#f43f5e", d20: "#6366f1", d100: "#64748b",
};

interface Props extends DiceRollBroadcast {
  onComplete: () => void;
}

export function DiceAnimation({ characterName, diceType, result, modifier, total, rollType, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("rolling");
  const [display, setDisplay] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("rolling");
  const angRef = useRef({ x: 0.2, y: 0, z: 0.1 });
  const velRef = useRef({ x: 0.067, y: 0.049, z: 0.031 });

  const sides = (() => {
    const m = diceType.match(/d(\d+)/i);
    return m ? parseInt(m[1]) : 20;
  })();

  const isCrit   = diceType === "d20" && result === 20;
  const isFumble = diceType === "d20" && result === 1;
  const firstDie = diceType.split("+")[0]?.trim() ?? "d20";
  const accentColor = DICE_COLOR[firstDie] ?? DICE_COLOR.d20;

  // Keep phaseRef in sync with phase state
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Phase timers + number cycling
  useEffect(() => {
    setPhase("rolling");
    phaseRef.current = "rolling";
    setDisplay(1);
    // Reset rotation for each new roll
    angRef.current = { x: 0.2, y: 0, z: 0.1 };
    velRef.current = { x: 0.067, y: 0.049, z: 0.031 };

    const fastInterval = setInterval(() => {
      setDisplay(Math.floor(Math.random() * sides) + 1);
    }, 70);
    intervalRef.current = fastInterval;

    const slowTimer = setTimeout(() => {
      clearInterval(fastInterval);
      intervalRef.current = setInterval(() => {
        setDisplay(Math.floor(Math.random() * sides) + 1);
      }, 180);
    }, 800);

    const stopTimer = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplay(result);
      setPhase("result");
      phaseRef.current = "result";
    }, 1400);

    const doneTimer = setTimeout(() => {
      setPhase("done");
      phaseRef.current = "done";
      onComplete();
    }, 4500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(slowTimer);
      clearTimeout(stopTimer);
      clearTimeout(doneTimer);
    };
  }, [result, sides, onComplete]);

  // Canvas 3D animation loop — runs once, reads phase via ref
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxRaw = canvas.getContext("2d");
    if (!ctxRaw) return;
    const ctx: CanvasRenderingContext2D = ctxRaw;

    const SIZE = canvas.width;
    const CX = SIZE / 2;
    const CY = SIZE / 2;
    const SCALE = SIZE * 0.29;
    const FOV = SIZE * 0.65;

    function rotateVert([x, y, z]: [number, number, number], rx: number, ry: number, rz: number): [number, number, number] {
      const y1 = y * Math.cos(rx) - z * Math.sin(rx);
      const z1 = y * Math.sin(rx) + z * Math.cos(rx);
      const x2 = x * Math.cos(ry) + z1 * Math.sin(ry);
      const z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
      const x3 = x2 * Math.cos(rz) - y1 * Math.sin(rz);
      const y3 = x2 * Math.sin(rz) + y1 * Math.cos(rz);
      return [x3, y3, z2];
    }

    function project([x, y, z]: [number, number, number]): [number, number] {
      const s = FOV / (FOV + z * SCALE);
      return [CX + x * SCALE * s, CY + y * SCALE * s];
    }

    function drawFrame() {
      ctx.clearRect(0, 0, SIZE, SIZE);
      const { x: rx, y: ry, z: rz } = angRef.current;
      const rotated = VERTS.map((v) => rotateVert(v, rx, ry, rz));
      const isResult = phaseRef.current === "result";

      const visible: { depth: number; pts: [[number,number],[number,number],[number,number]]; bright: number }[] = [];

      for (const [a, b, c] of FACES) {
        const va = rotated[a], vb = rotated[b], vc = rotated[c];
        const abx = vb[0]-va[0], aby = vb[1]-va[1], abz = vb[2]-va[2];
        const acx = vc[0]-va[0], acy = vc[1]-va[1], acz = vc[2]-va[2];
        const nx = aby*acz - abz*acy;
        const ny = abz*acx - abx*acz;
        const nz = abx*acy - aby*acx;
        if (nz < 0) continue; // backface culled
        const nm = Math.sqrt(nx*nx + ny*ny + nz*nz);
        const bright = Math.max(0, (nx*LIGHT[0] + ny*LIGHT[1] + nz*LIGHT[2]) / nm);
        const depth = (va[2] + vb[2] + vc[2]) / 3;
        visible.push({ depth, bright, pts: [project(va), project(vb), project(vc)] });
      }
      visible.sort((a, b) => a.depth - b.depth);

      for (const { pts, bright } of visible) {
        // Indigo palette: shadow (#282860) → lit (#8b8ffc)
        const baseR = 40 + Math.round(bright * 95);   // 40 → 135
        const baseG = 43 + Math.round(bright * 82);   // 43 → 125
        const baseB = 180 + Math.round(bright * 75);  // 180 → 255
        const alpha = isResult ? 0.22 : 0.82;

        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.closePath();
        ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},${alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(165,180,252,${alpha * 0.55})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // Glow overlay on fully visible top faces during rolling
      if (!isResult) {
        const topFace = visible[visible.length - 1];
        if (topFace && topFace.bright > 0.6) {
          const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, SCALE * 0.4);
          grad.addColorStop(0, "rgba(99,102,241,0.12)");
          grad.addColorStop(1, "rgba(99,102,241,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, SIZE, SIZE);
        }
      }
    }

    function animate() {
      if (phaseRef.current === "done") return;
      const v = velRef.current;
      if (phaseRef.current === "result") {
        velRef.current = { x: v.x * 0.963, y: v.y * 0.963, z: v.z * 0.963 };
      }
      angRef.current.x += velRef.current.x;
      angRef.current.y += velRef.current.y;
      angRef.current.z += velRef.current.z;
      drawFrame();
      rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  if (phase === "done") return null;

  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* 3D icosahedron canvas — background */}
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="absolute pointer-events-none select-none"
        style={{
          opacity: phase === "result" ? 0.55 : 1,
          transition: "opacity 0.9s ease",
          filter: phase === "rolling" ? "drop-shadow(0 0 28px rgba(99,102,241,0.45))" : undefined,
        }}
      />

      {/* Foreground result card */}
      <div className="relative bg-card/96 backdrop-blur-md border shadow-2xl rounded-2xl p-6 flex flex-col items-center gap-3 min-w-[200px] z-10">
        {/* Die face */}
        <div
          className={cn(
            "relative h-28 w-28 rounded-2xl flex items-center justify-center shadow-inner",
            phase === "rolling" && "animate-bounce",
            isCrit   && phase === "result" && "ring-4 ring-yellow-400",
            isFumble && phase === "result" && "ring-4 ring-red-500",
          )}
          style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor}77)` }}
        >
          <span className={cn(
            "text-5xl font-black tabular-nums select-none",
            phase === "rolling" ? "text-white/60" : "text-white drop-shadow-md",
          )}>
            {display}
          </span>
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-card border px-2 py-0.5 rounded-full text-foreground">
            {diceType}
          </span>
        </div>

        {/* Label */}
        <div className="text-center mt-2 space-y-0.5">
          <p className="text-sm font-semibold">{characterName}</p>
          <p className="text-xs text-muted-foreground">{rollType}</p>
        </div>

        {/* Result breakdown */}
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
    </div>
  );
}
