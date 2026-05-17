import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { DiceRollBroadcast } from "../types/encounter.types";

type AnimState = "spinning" | "settling" | "result" | "done";

interface Props extends DiceRollBroadcast {
  onComplete: () => void;
}

export function DiceAnimation({
  characterName,
  diceType,
  result,
  total,
  rollType,
  onComplete,
}: Props) {
  const [phase, setPhase] = useState<AnimState>("spinning");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("settling"), 1200);
    const t2 = setTimeout(() => setPhase("result"), 1600);
    const t3 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 4100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div className="flex flex-col items-center gap-3 pointer-events-none">
      <div
        className="relative"
        style={{ perspective: "400px", perspectiveOrigin: "50% 50%" }}
      >
        <div
          className={cn(
            "relative w-20 h-20",
            "transition-transform",
            phase === "spinning" && "animate-dice-spin",
            phase === "settling" && "animate-dice-settle"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Six faces of the cube */}
          {[
            { transform: "rotateY(0deg) translateZ(40px)", label: result },
            { transform: "rotateY(90deg) translateZ(40px)", label: "·" },
            { transform: "rotateY(180deg) translateZ(40px)", label: "·" },
            { transform: "rotateY(-90deg) translateZ(40px)", label: "·" },
            { transform: "rotateX(90deg) translateZ(40px)", label: "·" },
            { transform: "rotateX(-90deg) translateZ(40px)", label: "·" },
          ].map((face, i) => (
            <div
              key={i}
              className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-primary bg-card text-2xl font-bold"
              style={{ transform: face.transform, backfaceVisibility: "hidden" }}
            >
              {face.label}
            </div>
          ))}
        </div>
      </div>

      {phase === "result" && (
        <div className="text-center">
          <div className="text-xs text-muted-foreground">{characterName}</div>
          <div className="text-xs text-muted-foreground">{rollType} · {diceType}</div>
          <div className="text-3xl font-bold text-primary">{total}</div>
        </div>
      )}
    </div>
  );
}
