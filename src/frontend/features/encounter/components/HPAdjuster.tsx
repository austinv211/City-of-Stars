import { useEffect, useRef, useState } from "react";

interface Props {
  current: number;
  max: number;
}

// Display-only HP bar. HP changes go through DamageHealControl (typed damage/heal).
export function HPAdjuster({ current, max }: Props) {
  const prevRef = useRef(current);
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = current;
    if (current === prev) return;
    setFlashClass(current < prev ? "hp-flash-damage" : "hp-flash-heal");
    const t = setTimeout(() => setFlashClass(""), 700);
    return () => clearTimeout(t);
  }, [current]);

  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const fill = pct > 50 ? "bg-success" : pct > 25 ? "bg-secondary" : "bg-destructive";
  const textColor = pct > 50 ? "text-success" : pct > 25 ? "text-secondary" : "text-destructive";

  return (
    <div className={`space-y-1.5 ${flashClass}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold">{current} / {max} HP</span>
        <span className={`text-xs ${textColor}`}>{Math.round(pct)}%</span>
      </div>
      {/* Custom bar: a muted track with a colored fill — the track is always
          visually distinct from the fill so partial HP never reads as empty. */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
