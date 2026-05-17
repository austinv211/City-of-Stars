import { useEffect, useRef, useState } from "react";
import { useCampaign } from "@/core/context/CampaignContext";
import { supabase } from "@/lib/supabase";
import { DiceAnimation } from "@/features/encounter/components/DiceAnimation";
import type { DiceRollBroadcast } from "@/features/encounter/types/encounter.types";

export default function DiceRollOverlay() {
  const { campaign } = useCampaign();
  const [current, setCurrent] = useState<DiceRollBroadcast | null>(null);
  const queue = useRef<DiceRollBroadcast[]>([]);
  const busy = useRef(false);

  function dequeue() {
    if (queue.current.length === 0) {
      busy.current = false;
      setCurrent(null);
      return;
    }
    busy.current = true;
    setCurrent(queue.current.shift()!);
  }

  useEffect(() => {
    if (!campaign) return;

    const channel = supabase
      .channel(`dice:${campaign.id}`)
      .on("broadcast", { event: "roll" }, ({ payload }) => {
        queue.current.push(payload as DiceRollBroadcast);
        if (!busy.current) dequeue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign]);

  if (!current) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <DiceAnimation
        key={`${current.characterName}-${Date.now()}`}
        result={current.result}
        diceType={current.diceType}
        characterName={current.characterName}
        rollType={current.rollType}
        modifier={current.modifier}
        total={current.total}
        onComplete={dequeue}
      />
    </div>
  );
}
