import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import type { DiceRollBroadcast } from "../types/encounter.types";

function cryptoRoll(sides: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % sides) + 1;
}

export interface RollOptions {
  campaignId: string;
  encounterId: string | null;
  characterName: string;
  diceType: string;
  sides: number;
  modifier: number;
  rollType: string;
}

export interface RollEntry extends DiceRollBroadcast {
  id: string;
  ts: number;
}

interface DiceContextValue {
  roll: (opts: RollOptions) => void;
  history: RollEntry[];
  animQueue: DiceRollBroadcast[];
  shiftAnim: () => void;
}

const DiceContext = createContext<DiceContextValue | null>(null);

export function DiceProvider({ children }: { children: React.ReactNode }) {
  const { campaign } = useCampaign();
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [animQueue, setAnimQueue] = useState<DiceRollBroadcast[]>([]);

  useEffect(() => {
    if (!campaign) return;
    const channel = supabase
      .channel(`dice:${campaign.id}`)
      .on("broadcast", { event: "roll" }, ({ payload }) => {
        // Received from OTHER clients — add to our history + animation queue
        const entry = payload as DiceRollBroadcast;
        setHistory((prev) =>
          [{ ...entry, id: crypto.randomUUID(), ts: Date.now() }, ...prev].slice(0, 100)
        );
        setAnimQueue((prev) => [...prev, entry]);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [campaign?.id]);

  const roll = useCallback(
    (opts: RollOptions) => {
      const result = cryptoRoll(opts.sides);
      const total = result + opts.modifier;
      const broadcast: DiceRollBroadcast = {
        characterName: opts.characterName,
        diceType: opts.diceType,
        result,
        modifier: opts.modifier,
        total,
        rollType: opts.rollType,
      };

      // Local update — the channel doesn't echo back to sender by default
      setHistory((prev) =>
        [{ ...broadcast, id: crypto.randomUUID(), ts: Date.now() }, ...prev].slice(0, 100)
      );
      setAnimQueue((prev) => [...prev, broadcast]);

      // Broadcast to other clients (subscribed channel required for send to work)
      channelRef.current?.send({ type: "broadcast", event: "roll", payload: broadcast });

      // Persist (fire-and-forget)
      if (user) {
        supabase.from("dice_rolls").insert({
          campaign_id: opts.campaignId,
          encounter_id: opts.encounterId,
          user_id: user.id,
          dice_type: opts.diceType,
          result,
          modifier: opts.modifier,
          total,
          roll_type: opts.rollType,
        });
      }
    },
    [user]
  );

  const shiftAnim = useCallback(() => {
    setAnimQueue((prev) => prev.slice(1));
  }, []);

  return (
    <DiceContext.Provider value={{ roll, history, animQueue, shiftAnim }}>
      {children}
    </DiceContext.Provider>
  );
}

export function useDice() {
  const ctx = useContext(DiceContext);
  if (!ctx) throw new Error("useDice must be inside DiceProvider");
  return ctx;
}
