import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Progress } from "@/core/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Dice6 } from "lucide-react";
import {
  POINT_BUY_COSTS,
  POINT_BUY_BUDGET,
  POINT_BUY_MIN,
  POINT_BUY_MAX,
} from "../../data/dnd2024.constants";
import {
  STANDARD_ARRAY,
  finalAbilityScores,
} from "../../types/character.types";
import type { WizardState, WizardAction, AbilityName, AbilityScores } from "../../types/character.types";

const ABILITIES: AbilityName[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

const ABILITY_LABELS: Record<AbilityName, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

function mod(score: number) {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

function pointBuySpent(scores: AbilityScores): number {
  return ABILITIES.reduce((sum, a) => sum + (POINT_BUY_COSTS[scores[a]] ?? 0), 0);
}

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onNext: () => void;
}

// ── Standard Array ────────────────────────────────────────────────────────────

function StandardArrayTab({ state, dispatch }: Pick<Props, "state" | "dispatch">) {
  const assigned = state.baseAbilityScores;

  function getAvailableValues() {
    const picked = ABILITIES.map((a) => assigned[a]);
    const remaining = [...STANDARD_ARRAY];
    for (const v of picked) {
      const idx = remaining.indexOf(v);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    return remaining;
  }

  function handleAssign(ability: AbilityName, value: string) {
    dispatch({ type: "SET_SCORE", ability, value: Number(value) });
  }

  const allAssigned = ABILITIES.every((a) => STANDARD_ARRAY.includes(assigned[a]));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Assign each value from the standard array (15, 14, 13, 12, 10, 8) to an ability score.
        Each value can only be used once.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {ABILITIES.map((ability) => {
          const current = assigned[ability];
          const available = getAvailableValues();
          const options = [...available];
          if (STANDARD_ARRAY.includes(current)) options.push(current);
          options.sort((a, b) => b - a);

          return (
            <div key={ability} className="flex items-center gap-3">
              <div className="w-10 text-sm font-mono font-semibold text-muted-foreground">
                {ABILITY_LABELS[ability]}
              </div>
              <Select
                value={STANDARD_ARRAY.includes(current) ? String(current) : ""}
                onValueChange={(v) => handleAssign(ability, v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-10 text-sm font-mono text-center text-muted-foreground">
                {STANDARD_ARRAY.includes(current) ? mod(current) : "—"}
              </div>
            </div>
          );
        })}
      </div>
      {!allAssigned && (
        <p className="text-xs text-amber-600">Assign all 6 values to continue</p>
      )}
    </div>
  );
}

// ── Point Buy ─────────────────────────────────────────────────────────────────

function PointBuyTab({ state, dispatch }: Pick<Props, "state" | "dispatch">) {
  const scores = state.baseAbilityScores;
  const spent = pointBuySpent(scores);
  const remaining = POINT_BUY_BUDGET - spent;

  function adjust(ability: AbilityName, delta: number) {
    const current = scores[ability];
    const next = current + delta;
    if (next < POINT_BUY_MIN || next > POINT_BUY_MAX) return;
    const costDelta = (POINT_BUY_COSTS[next] ?? 0) - (POINT_BUY_COSTS[current] ?? 0);
    if (remaining - costDelta < 0) return;
    dispatch({ type: "SET_SCORE", ability, value: next });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Points remaining</span>
          <span className={remaining === 0 ? "text-green-600 font-semibold" : "font-semibold"}>
            {remaining} / {POINT_BUY_BUDGET}
          </span>
        </div>
        <Progress value={((POINT_BUY_BUDGET - remaining) / POINT_BUY_BUDGET) * 100} />
      </div>

      <div className="space-y-2">
        {ABILITIES.map((ability) => {
          const value = scores[ability];
          const canIncrease =
            value < POINT_BUY_MAX &&
            remaining >= (POINT_BUY_COSTS[value + 1] ?? 0) - (POINT_BUY_COSTS[value] ?? 0);
          const canDecrease = value > POINT_BUY_MIN;

          return (
            <div key={ability} className="flex items-center gap-3">
              <div className="w-28 text-sm font-semibold">{ABILITY_LABELS[ability]}</div>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!canDecrease}
                onClick={() => adjust(ability, -1)}
              >
                −
              </Button>
              <div className="w-8 text-center font-mono font-semibold">{value}</div>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={!canIncrease}
                onClick={() => adjust(ability, 1)}
              >
                +
              </Button>
              <div className="ml-2 text-sm text-muted-foreground font-mono">{mod(value)}</div>
              <div className="ml-auto text-xs text-muted-foreground">
                cost {POINT_BUY_COSTS[value] ?? 0}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Rolled ────────────────────────────────────────────────────────────────────

function rollAbility(): number {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  rolls.sort((a, b) => a - b);
  return rolls.slice(1).reduce((sum, v) => sum + v, 0); // drop lowest
}

function RolledTab({ state, dispatch }: Pick<Props, "state" | "dispatch">) {
  const [rolled, setRolled] = useState<Record<AbilityName, boolean>>({
    strength: false, dexterity: false, constitution: false,
    intelligence: false, wisdom: false, charisma: false,
  });

  function roll(ability: AbilityName) {
    const value = rollAbility();
    dispatch({ type: "SET_SCORE", ability, value });
    setRolled((prev) => ({ ...prev, [ability]: true }));
  }

  function rollAll() {
    ABILITIES.forEach((a) => {
      const value = rollAbility();
      dispatch({ type: "SET_SCORE", ability: a, value });
    });
    setRolled({ strength: true, dexterity: true, constitution: true, intelligence: true, wisdom: true, charisma: true });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Roll 4d6, drop the lowest die, for each ability. Results are random and unmodifiable.
      </p>
      <Button variant="outline" className="w-full" onClick={rollAll}>
        <Dice6 className="mr-2 h-4 w-4" />
        Roll All
      </Button>
      <div className="space-y-2">
        {ABILITIES.map((ability) => {
          const value = state.baseAbilityScores[ability];
          const hasRolled = rolled[ability];
          return (
            <div key={ability} className="flex items-center gap-3">
              <div className="w-28 text-sm font-semibold">{ABILITY_LABELS[ability]}</div>
              <div className="flex-1 font-mono font-bold text-lg text-center">
                {hasRolled ? value : "—"}
              </div>
              <div className="w-12 text-sm font-mono text-muted-foreground">
                {hasRolled ? mod(value) : ""}
              </div>
              <Button variant="outline" size="sm" onClick={() => roll(ability)}>
                <Dice6 className="mr-1 h-3 w-3" />
                Roll
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Score preview with background bonuses ─────────────────────────────────────

function ScorePreview({ state }: { state: WizardState }) {
  const final = finalAbilityScores(
    state.baseAbilityScores,
    state.backgroundBonusPrimary,
    state.backgroundBonusSecondary
  );
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Final scores (with background bonuses)
      </p>
      <div className="grid grid-cols-6 gap-2 text-center">
        {ABILITIES.map((a) => (
          <div key={a}>
            <div className="text-xs text-muted-foreground">{ABILITY_LABELS[a]}</div>
            <div className="font-bold">{final[a]}</div>
            <div className="text-xs text-muted-foreground">{mod(final[a])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Step3_AbilityScores({ state, dispatch, onNext }: Props) {
  const scores = state.baseAbilityScores;
  const method = state.abilityScoreMethod;

  const standardArrayComplete =
    method !== "standard_array" ||
    (ABILITIES.every((a) => STANDARD_ARRAY.includes(scores[a])) &&
      new Set(ABILITIES.map((a) => scores[a])).size === 6);

  const pointBuyValid = method !== "point_buy" ||
    pointBuySpent(scores) <= POINT_BUY_BUDGET;

  const rolledComplete = method !== "rolled" || ABILITIES.every((a) => scores[a] > 8 || true);

  const canContinue = standardArrayComplete && pointBuyValid && rolledComplete;

  function handleTabChange(value: string) {
    dispatch({
      type: "SET_FIELD",
      field: "abilityScoreMethod",
      value: value as WizardState["abilityScoreMethod"],
    });
  }

  return (
    <div className="space-y-6">
      <Tabs value={method} onValueChange={handleTabChange}>
        <TabsList className="w-full">
          <TabsTrigger value="standard_array" className="flex-1">Standard Array</TabsTrigger>
          <TabsTrigger value="point_buy" className="flex-1">Point Buy</TabsTrigger>
          <TabsTrigger value="rolled" className="flex-1">Rolled</TabsTrigger>
        </TabsList>
        <TabsContent value="standard_array" className="mt-4">
          <StandardArrayTab state={state} dispatch={dispatch} />
        </TabsContent>
        <TabsContent value="point_buy" className="mt-4">
          <PointBuyTab state={state} dispatch={dispatch} />
        </TabsContent>
        <TabsContent value="rolled" className="mt-4">
          <RolledTab state={state} dispatch={dispatch} />
        </TabsContent>
      </Tabs>

      <ScorePreview state={state} />

      <Button className="w-full" disabled={!canContinue} onClick={onNext}>
        Next: Proficiencies
      </Button>
    </div>
  );
}
