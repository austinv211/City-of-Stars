import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import DiceBox from "@3d-dice/dice-box";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { incrementPartyStat } from "@/features/campaign/lib/partyStatsUtils";
import type { DiceRollBroadcast, ActionCategory } from "../types/encounter.types";

function cryptoRoll(sides: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return (array[0] % sides) + 1;
}

// Validates a value returned by DiceBox. Returns cryptoRoll fallback for any
// NaN/undefined/out-of-range result (can occur when settle timeout fires before
// a die comes to rest, or when DiceBox uses two d10s to simulate a d100).
function safeValue(v: unknown, sides: number): number {
  if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= sides) return v;
  return cryptoRoll(sides);
}

export interface RollOptions {
  campaignId: string;
  encounterId: string | null;
  characterName: string;
  rolledByDm?: boolean;
  diceType: string;
  sides: number;
  modifier: number;
  rollType: string;
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

  // Lazy-init DiceBox on first roll. By then #dice-box-container is in the
  // DOM (rendered by DiceBoxOverlay, which mounts inside this provider).
  const getOrInitBox = useCallback((): Promise<InstanceType<typeof DiceBox>> => {
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
        } as ConstructorParameters<typeof DiceBox>[0]);
        initPromiseRef.current = box
          .init()
          .then(() => { boxRef.current = box; })
          .catch((e) => { console.error("[DiceBox] init() failed:", e); });
      } catch (e) {
        console.error("[DiceBox] constructor failed:", e);
        return Promise.reject(e);
      }
    }
    return initPromiseRef.current.then(() => {
      if (!boxRef.current) throw new Error("DiceBox not initialized");
      return boxRef.current;
    });
  }, []);

  useEffect(() => {
    if (!campaign) return;

    async function seedFromDb() {
      const { data: rows } = await supabase
        .from("dice_rolls")
        .select("*")
        .eq("campaign_id", campaign!.id)
        .order("rolled_at", { ascending: false })
        .limit(50);

      if (!rows?.length) return;

      const seed: RollEntry[] = rows.map((r) => ({
        id: r.id as string,
        ts: new Date(r.rolled_at as string).getTime(),
        characterName: (r.character_name as string | null) ?? "Unknown",
        rolledByDm: (r.rolled_by_dm as boolean) ?? false,
        diceType: r.dice_type as string,
        result: r.result as number,
        modifier: (r.modifier as number) ?? 0,
        total: r.total as number,
        rollType: r.roll_type as string,
        encounterId: (r.encounter_id as string) ?? null,
        rolls: [],
      }));

      setHistory((prev) => {
        const prevIds = new Set(prev.map((e) => e.id));
        const fresh = seed.filter((s) => !prevIds.has(s.id));
        return [...prev, ...fresh].slice(0, 100);
      });
    }

    seedFromDb();

    const channel = supabase
      .channel(`dice:${campaign.id}`)
      .on("broadcast", { event: "roll" }, ({ payload }) => {
        const entry = payload as DiceRollBroadcast;
        setHistory((prev) =>
          [{ ...entry, id: crypto.randomUUID(), ts: Date.now(), encounterId: entry.encounterId ?? null }, ...prev].slice(0, 100)
        );
        // Do NOT push to animQueue here — the overlay only shows for the client
        // that made the roll. animQueue is populated by roll() / rollPool() locally.
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [campaign?.id]);

  const roll = useCallback(async (opts: RollOptions) => {
    // Show canvas immediately so the user sees the backdrop while DiceBox inits/rolls.
    setDiceAnimating(true);

    // Parse count from diceType ("2d6" → 2, "d20" → 1).
    const countMatch = opts.diceType.match(/^(\d+)/i);
    const diceCount = countMatch ? parseInt(countMatch[1]) : 1;
    const notation = `${diceCount}d${opts.sides}`;

    // DiceBox is the authoritative RNG — its physics result is what the card shows.
    let individualRolls: number[];
    let result: number;
    try {
      const box = await getOrInitBox();
      const rollResults = await box.roll(notation);
      individualRolls = rollResults.map((r) => safeValue(r.value, opts.sides));
      // Pad if DiceBox returned fewer dice than requested (e.g. settle timeout)
      while (individualRolls.length < diceCount) individualRolls.push(cryptoRoll(opts.sides));
      result = individualRolls.reduce((a, b) => a + b, 0);
    } catch {
      individualRolls = Array.from({ length: diceCount }, () => cryptoRoll(opts.sides));
      result = individualRolls.reduce((a, b) => a + b, 0);
    }

    // Populate the queue after physics settles so the result card matches the die face.
    const total = result + opts.modifier;
    const broadcast: DiceRollBroadcast = {
      characterName: opts.characterName,
      rolledByDm: opts.rolledByDm ?? false,
      diceType: opts.diceType,
      result,
      modifier: opts.modifier,
      total,
      rollType: opts.rollType,
      encounterId: opts.encounterId,
      rolls: individualRolls,
    };

    setHistory((prev) =>
      [{ ...broadcast, id: crypto.randomUUID(), ts: Date.now(), encounterId: opts.encounterId }, ...prev].slice(0, 100)
    );
    setAnimQueue((prev) => [...prev, broadcast]);
    channelRef.current?.send({ type: "broadcast", event: "roll", payload: broadcast });

    if (user) {
      const { error: insertErr } = await supabase.from("dice_rolls").insert({
        campaign_id: opts.campaignId,
        encounter_id: opts.encounterId,
        user_id: user.id,
        character_name: opts.characterName,
        rolled_by_dm: opts.rolledByDm ?? false,
        dice_type: opts.diceType,
        result,
        modifier: opts.modifier,
        total,
        roll_type: opts.rollType,
      });
      if (insertErr) console.error("[dice_rolls insert]", insertErr);
    }

    if (opts.sides === 20) {
      if (result === 20) incrementPartyStat(opts.campaignId, "total_crits", 1);
      if (result === 1)  incrementPartyStat(opts.campaignId, "total_fumbles", 1);
    }
    if (opts.rollType.toLowerCase().includes("dmg") || opts.rollType.toLowerCase().includes("damage")) {
      incrementPartyStat(opts.campaignId, "total_damage_dealt", total);
    }

    return total;
  }, [user, getOrInitBox]);

  const rollPool = useCallback(async (opts: PoolRollOptions) => {
    const diceLabel = opts.pool.map(({ count, sides }) => `${count}d${sides}`).join("+");
    const useAdvDis = opts.advantage || opts.disadvantage;

    setDiceAnimating(true);

    let diceSum = 0;
    let discardedRoll: number | undefined;
    let d20Result: number | undefined;
    const allRolls: number[] = [];

    const notationParts = opts.pool.map(({ sides, count }) => `${count}d${sides}`);

    function sumResults(results: { sides: number; value: number }[]): number {
      return results.reduce((s, r) => s + safeValue(r.value, r.sides), 0);
    }

    function cryptoSumPool(): number {
      return opts.pool.reduce((s, { sides, count }) =>
        s + Array.from({ length: count }, () => cryptoRoll(sides)).reduce((a, b) => a + b, 0), 0);
    }

    try {
      const box = await getOrInitBox();

      if (useAdvDis) {
        const results1 = await box.roll(notationParts);
        const sum1 = sumResults(results1);
        const results2 = await box.roll(notationParts);
        const sum2 = sumResults(results2);
        const keep = opts.advantage ? Math.max(sum1, sum2) : Math.min(sum1, sum2);
        const drop = opts.advantage ? Math.min(sum1, sum2) : Math.max(sum1, sum2);
        diceSum = keep;
        discardedRoll = drop;
        allRolls.push(keep);
        if (opts.pool.length === 1 && opts.pool[0].sides === 20 && opts.pool[0].count === 1) {
          d20Result = keep;
        }
      } else {
        const results = await box.roll(notationParts);
        const bySides = new Map<number, number[]>();
        for (const r of results) {
          bySides.set(r.sides, [...(bySides.get(r.sides) ?? []), safeValue(r.value, r.sides)]);
        }
        for (const { sides, count } of opts.pool) {
          const slice = (bySides.get(sides) ?? []).slice(0, count);
          while (slice.length < count) slice.push(cryptoRoll(sides));
          if (sides === 20) d20Result = slice[0];
          diceSum += slice.reduce((s, v) => s + v, 0);
          allRolls.push(...slice);
        }
      }
    } catch {
      if (useAdvDis) {
        const sum1 = cryptoSumPool();
        const sum2 = cryptoSumPool();
        const keep = opts.advantage ? Math.max(sum1, sum2) : Math.min(sum1, sum2);
        const drop = opts.advantage ? Math.min(sum1, sum2) : Math.max(sum1, sum2);
        diceSum = keep;
        discardedRoll = drop;
        allRolls.push(keep);
        if (opts.pool.length === 1 && opts.pool[0].sides === 20 && opts.pool[0].count === 1) {
          d20Result = keep;
        }
      } else {
        for (const { sides, count } of opts.pool) {
          const rolls = Array.from({ length: count }, () => cryptoRoll(sides));
          if (sides === 20) d20Result = rolls[0];
          diceSum += rolls.reduce((a, b) => a + b, 0);
          allRolls.push(...rolls);
        }
      }
    }

    const total = diceSum + opts.modifier;
    const rollType = opts.rollType || diceLabel;

    const broadcast: DiceRollBroadcast = {
      characterName: opts.characterName,
      rolledByDm: opts.rolledByDm ?? false,
      diceType: diceLabel,
      result: diceSum,
      modifier: opts.modifier,
      total,
      rollType,
      encounterId: opts.encounterId,
      advantage: opts.advantage || undefined,
      disadvantage: opts.disadvantage || undefined,
      discardedRoll,
      rolls: allRolls,
    };

    setHistory((prev) =>
      [{ ...broadcast, id: crypto.randomUUID(), ts: Date.now(), encounterId: opts.encounterId }, ...prev].slice(0, 100)
    );
    setAnimQueue((prev) => [...prev, broadcast]);
    channelRef.current?.send({ type: "broadcast", event: "roll", payload: broadcast });

    if (user) {
      const { error: insertErr } = await supabase.from("dice_rolls").insert({
        campaign_id: opts.campaignId,
        encounter_id: opts.encounterId,
        user_id: user.id,
        character_name: opts.characterName,
        rolled_by_dm: opts.rolledByDm ?? false,
        dice_type: diceLabel,
        result: diceSum,
        modifier: opts.modifier,
        total,
        roll_type: rollType,
      });
      if (insertErr) console.error("[dice_rolls insert]", insertErr);
    }

    if (d20Result !== undefined) {
      if (d20Result === 20) incrementPartyStat(opts.campaignId, "total_crits", 1);
      if (d20Result === 1)  incrementPartyStat(opts.campaignId, "total_fumbles", 1);
    }
    if (rollType.toLowerCase().includes("dmg") || rollType.toLowerCase().includes("damage")) {
      incrementPartyStat(opts.campaignId, "total_damage_dealt", total);
    }

    return total;
  }, [user, getOrInitBox]);

  const announceAction = useCallback((opts: ActionAnnounceOptions) => {
    const broadcast: DiceRollBroadcast = {
      characterName: opts.characterName,
      diceType: "",
      result: 0,
      modifier: 0,
      total: 0,
      rollType: "",
      encounterId: opts.encounterId,
      kind: "action",
      actionText: opts.actionText,
      actionCategory: opts.actionCategory,
    };
    setHistory((prev) =>
      [{ ...broadcast, id: crypto.randomUUID(), ts: Date.now(), encounterId: opts.encounterId }, ...prev].slice(0, 100)
    );
    channelRef.current?.send({ type: "broadcast", event: "roll", payload: broadcast });
  }, []);

  const shiftAnim = useCallback(() => {
    setAnimQueue((prev) => prev.slice(1));
  }, []);

  const clearDiceAnimation = useCallback(() => {
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
