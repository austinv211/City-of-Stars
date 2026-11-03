import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import DiceBox from "@3d-dice/dice-box";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { incrementPartyStat } from "@/features/campaign/lib/partyStatsUtils";
import type { DiceRollBroadcast, ActionCategory, RollContext } from "../types/encounter.types";
import { dice } from "../components/stage/combatantStats";
import { boxSource, cryptoSource } from "../lib/diceSources";
import { rollPoolWith, type Pool } from "../lib/poolDice";
import { isDamageRoll, rollFromRow, storedContext } from "../lib/rollRecord";
import { DETERMINISTIC_DICE } from "../lib/testDice";

export interface RollOptions {
  campaignId: string;
  encounterId: string | null;
  characterName: string;
  rolledByDm?: boolean;
  diceType: string;
  sides: number;
  modifier: number;
  rollType: string;
  context?: RollContext;
}

export interface RollEntry extends DiceRollBroadcast {
  id: string;
  ts: number;
  encounterId: string | null;
}

export interface ActionAnnounceOptions {
  campaignId: string;
  encounterId: string | null;
  characterName: string;
  actionText: string;
  actionCategory: ActionCategory;
  rolledByDm?: boolean;
  context?: RollContext;
}

export interface PoolRollOptions {
  campaignId: string;
  encounterId: string | null;
  characterName: string;
  rolledByDm?: boolean;
  pool: { sides: number; count: number }[];
  modifier: number;
  advantage: boolean;
  disadvantage: boolean;
  rollType: string;
  context?: RollContext;
}

interface DiceContextValue {
  roll: (opts: RollOptions) => Promise<number>;
  rollPool: (opts: PoolRollOptions) => Promise<number>;
  announceAction: (opts: ActionAnnounceOptions) => void;
  history: RollEntry[];
  animQueue: DiceRollBroadcast[];
  shiftAnim: () => void;
  diceAnimating: boolean;
  clearDiceAnimation: () => void;
}

const DiceContext = createContext<DiceContextValue | null>(null);

export function DiceProvider({ children }: { children: React.ReactNode }) {
  const { campaign } = useCampaign();
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const boxRef = useRef<InstanceType<typeof DiceBox> | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const [history, setHistory] = useState<RollEntry[]>([]);
  const [animQueue, setAnimQueue] = useState<DiceRollBroadcast[]>([]);
  const [diceAnimating, setDiceAnimating] = useState(false);
  // Physics rolls still settling. While any is, the table is theirs: see
  // clearDiceAnimation.
  const inFlightRef = useRef(0);

  // Lazy-init DiceBox on first roll. By then #dice-box-container is in the
  // DOM (rendered by DiceBoxOverlay, which mounts inside this provider).
  const getOrInitBox = useCallback((): Promise<InstanceType<typeof DiceBox>> => {
    // E2E: no physics. Rejecting sends every roll down the fallback path,
    // which draws from the deterministic source via cryptoRoll.
    if (DETERMINISTIC_DICE) return Promise.reject(new Error("deterministic dice"));
    if (!initPromiseRef.current) {
      try {
        const box = new DiceBox({
          assetPath: "/assets/dice-box/",
          container: "#dice-box-container",
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
          settleTimeout: 3000,
        });
        initPromiseRef.current = box
          .init()
          .then(() => { boxRef.current = box; })
          .catch((e: unknown) => { console.error("[DiceBox] init() failed:", e); });
      } catch (e) {
        console.error("[DiceBox] constructor failed:", e);
        return Promise.reject(e instanceof Error ? e : new Error(String(e)));
      }
    }
    return initPromiseRef.current.then(() => {
      if (!boxRef.current) throw new Error("DiceBox not initialized");
      return boxRef.current;
    });
  }, []);

  useEffect(() => {
    if (!campaign) return;
    const campaignId = campaign.id;

    async function seedFromDb() {
      const { data: rows } = await supabase
        .from("dice_rolls")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("rolled_at", { ascending: false })
        .limit(50);
      if (!rows?.length) return;
      const seed: RollEntry[] = rows.map(rollFromRow);
      setHistory((prev) => {
        const prevIds = new Set(prev.map((e) => e.id));
        return [...prev, ...seed.filter((s) => !prevIds.has(s.id))].slice(0, 100);
      });
    }

    void seedFromDb();

    const channel = supabase
      .channel(`dice:${campaignId}`)
      .on("broadcast", { event: "roll" }, ({ payload }) => {
        // Not into animQueue: the overlay shows only for whoever rolled.
        addToHistory(payload as DiceRollBroadcast);
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [campaign?.id]);

  function addToHistory(b: DiceRollBroadcast) {
    setHistory((prev) =>
      [{ ...b, id: crypto.randomUUID(), ts: Date.now(), encounterId: b.encounterId ?? null }, ...prev].slice(0, 100),
    );
  }

  // Throw a pool with the 3D dice when they work, the fallback RNG when not.
  // DiceBox is the authoritative RNG: its physics result is what the card shows.
  const throwDice = useCallback(
    async (pool: Pool, mode: { advantage: boolean; disadvantage: boolean }) => {
      // Show the canvas at once so the backdrop is up while DiceBox inits.
      setDiceAnimating(true);
      inFlightRef.current += 1;
      try {
        const box = await getOrInitBox().catch(() => null);
        try {
          return await rollPoolWith(box ? boxSource(box) : cryptoSource, pool, mode);
        } catch {
          return await rollPoolWith(cryptoSource, pool, mode);
        }
      } finally {
        inFlightRef.current -= 1;
      }
    },
    [getOrInitBox],
  );

  /** Show, broadcast and record a roll, and count it in the party's tallies. */
  const publish = useCallback(
    (b: DiceRollBroadcast, campaignId: string, d20?: number) => {
      addToHistory(b);
      if (b.kind !== "action") setAnimQueue((prev) => [...prev, b]);
      void channelRef.current?.send({ type: "broadcast", event: "roll", payload: b });

      if (user) {
        void supabase
          .from("dice_rolls")
          .insert({
            campaign_id: campaignId,
            encounter_id: b.encounterId ?? null,
            user_id: user.id,
            character_name: b.characterName,
            rolled_by_dm: b.rolledByDm ?? false,
            dice_type: b.diceType,
            result: b.result,
            modifier: b.modifier,
            total: b.total,
            // roll_type is required; an announcement's is its text.
            roll_type: b.rollType || (b.actionText ?? ""),
            context: storedContext(b),
          })
          .then(({ error }) => {
            if (error) console.error("[dice_rolls insert]", error);
          });
      }

      if (d20 === 20) void incrementPartyStat(campaignId, "total_crits", 1);
      if (d20 === 1) void incrementPartyStat(campaignId, "total_fumbles", 1);
      if (b.kind !== "action" && isDamageRoll(b)) {
        void incrementPartyStat(campaignId, "total_damage_dealt", b.total);
      }
    },
    [user],
  );

  const roll = useCallback(
    async (opts: RollOptions) => {
      // "2d6" -> 2, "d20" -> 1.
      const countMatch = /^(\d+)/i.exec(opts.diceType);
      const count = countMatch ? parseInt(countMatch[1]) : 1;
      const r = await throwDice([{ sides: opts.sides, count }], { advantage: false, disadvantage: false });
      const total = r.sum + opts.modifier;
      publish(
        {
          characterName: opts.characterName,
          rolledByDm: opts.rolledByDm ?? false,
          diceType: opts.diceType,
          result: r.sum,
          modifier: opts.modifier,
          total,
          rollType: opts.rollType,
          encounterId: opts.encounterId,
          rolls: r.rolls,
          context: opts.context,
        },
        opts.campaignId,
        r.d20,
      );
      return total;
    },
    [throwDice, publish],
  );

  const rollPool = useCallback(
    async (opts: PoolRollOptions) => {
      const diceLabel = opts.pool.map(({ count, sides }) => dice(count, sides)).join("+");
      const r = await throwDice(opts.pool, opts);
      const total = r.sum + opts.modifier;
      publish(
        {
          characterName: opts.characterName,
          rolledByDm: opts.rolledByDm ?? false,
          diceType: diceLabel,
          result: r.sum,
          modifier: opts.modifier,
          total,
          rollType: opts.rollType || diceLabel,
          encounterId: opts.encounterId,
          advantage: opts.advantage || undefined,
          disadvantage: opts.disadvantage || undefined,
          discardedRoll: r.discarded,
          rolls: r.rolls,
          context: opts.context,
        },
        opts.campaignId,
        r.d20,
      );
      return total;
    },
    [throwDice, publish],
  );

  const announceAction = useCallback(
    (opts: ActionAnnounceOptions) => {
      publish(
        {
          characterName: opts.characterName,
          rolledByDm: opts.rolledByDm ?? false,
          diceType: "",
          result: 0,
          modifier: 0,
          total: 0,
          rollType: "",
          encounterId: opts.encounterId,
          kind: "action",
          actionText: opts.actionText,
          actionCategory: opts.actionCategory,
          context: opts.context,
        },
        opts.campaignId,
      );
    },
    [publish],
  );

  const shiftAnim = useCallback(() => {
    setAnimQueue((prev) => prev.slice(1));
  }, []);

  const clearDiceAnimation = useCallback(() => {
    // The previous result card's dismiss timer must not clear the table under
    // a roll that is still settling: its dice would vanish mid-physics, never
    // settle, and its promise would never resolve -- the roll silently lost.
    // That roll's own card clears the box once it lands.
    if (inFlightRef.current > 0) return;
    boxRef.current?.clear();
    setDiceAnimating(false);
  }, []);

  return (
    <DiceContext.Provider value={{ roll, rollPool, announceAction, history, animQueue, shiftAnim, diceAnimating, clearDiceAnimation }}>
      {children}
    </DiceContext.Provider>
  );
}

export function useDice() {
  const ctx = useContext(DiceContext);
  if (!ctx) throw new Error("useDice must be inside DiceProvider");
  return ctx;
}
