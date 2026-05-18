import { DiceAnimation } from "@/features/encounter/components/DiceAnimation";
import { useDice } from "@/features/encounter/context/DiceContext";

export default function DiceRollOverlay() {
  const { animQueue, shiftAnim } = useDice();
  const current = animQueue[0] ?? null;

  if (!current) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <DiceAnimation
        key={`${current.characterName}-${current.rollType}-${animQueue.length}`}
        {...current}
        onComplete={shiftAnim}
      />
    </div>
  );
}
