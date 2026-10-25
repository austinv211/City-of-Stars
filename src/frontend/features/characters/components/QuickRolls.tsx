import { useState } from "react";
import { Dices } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { cn } from "@/lib/utils";
// The dice system is app-wide (AppShell mounts its provider) but lives in the
// encounter feature, where it began.
import { useDice } from "@/features/encounter/context/DiceContext";
import {
  ABILITY_ORDER,
  type CheckModifiers,
  type RollMode,
} from "../lib/checkModifiers";
import type { AbilityName } from "../types/character.types";

const SHORT: Record<AbilityName, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const MODES: { value: RollMode; label: string }[] = [
  { value: "advantage", label: "Advantage" },
  { value: "normal", label: "Normal" },
  { value: "disadvantage", label: "Disadvantage" },
];

const sign = (n: number) => (n >= 0 ? `+${String(n)}` : String(n));

/**
 * Ability checks, saving throws and skill checks, one tap each, away from the
 * encounter: "give me a Perception check" at the table. Rolls go through the
 * same dice system as combat -- the 3D dice and result card, the party's roll
 * log, the roll history -- just with no encounter attached.
 *
 * Advantage and disadvantage apply to the next roll only, then fall back to
 * Normal, so one roll's circumstances cannot quietly carry over to the next.
 */
export function QuickRolls({
  characterName,
  campaignId,
  checks,
}: {
  characterName: string;
  campaignId: string;
  checks: CheckModifiers;
}) {
  const { rollPool } = useDice();
  const [mode, setMode] = useState<RollMode>("normal");

  function roll(label: string, modifier: number) {
    const current = mode;
    setMode("normal");
    void rollPool({
      campaignId,
      encounterId: null,
      characterName,
      pool: [{ sides: 20, count: 1 }],
      modifier,
      advantage: current === "advantage",
      disadvantage: current === "disadvantage",
      rollType: label,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Dices className="h-4 w-4" />
          Quick Rolls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="radiogroup"
          aria-label="Roll with"
          className="grid grid-cols-3 border border-border/60"
        >
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              onClick={() => {
                setMode(m.value);
              }}
              className={cn(
                "h-11 text-xs font-medium transition-colors sm:h-9",
                mode === m.value
                  ? m.value === "disadvantage"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <RollGroup title="Ability checks">
          {ABILITY_ORDER.map((a) => (
            <RollButton
              key={a}
              label={SHORT[a]}
              mod={checks.abilities[a]}
              onRoll={() => {
                roll(`${SHORT[a]} Check`, checks.abilities[a]);
              }}
            />
          ))}
        </RollGroup>

        <RollGroup title="Saving throws">
          {ABILITY_ORDER.map((a) => (
            <RollButton
              key={a}
              label={SHORT[a]}
              mod={checks.saves[a].mod}
              marked={checks.saves[a].proficient}
              onRoll={() => {
                roll(`${SHORT[a]} Save`, checks.saves[a].mod);
              }}
            />
          ))}
        </RollGroup>

        <RollGroup title="Skills" wide>
          {checks.skills.map((s) => (
            <RollButton
              key={s.name}
              label={s.name}
              mod={s.mod}
              marked={s.proficiency !== "none"}
              expert={s.proficiency === "expert"}
              onRoll={() => {
                roll(`${s.name} Check`, s.mod);
              }}
            />
          ))}
        </RollGroup>
      </CardContent>
    </Card>
  );
}

function RollGroup({
  title,
  wide = false,
  children,
}: {
  title: string;
  /** Skill names need more room than three-letter abilities. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="space-y-1.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div
        className={cn(
          "grid gap-1.5",
          wide ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-6",
        )}
      >
        {children}
      </div>
    </section>
  );
}

function RollButton({
  label,
  mod,
  marked = false,
  expert = false,
  onRoll,
}: {
  label: string;
  mod: number;
  /** Proficient: shown filled, as the sheet shows proficiency elsewhere. */
  marked?: boolean;
  expert?: boolean;
  onRoll: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRoll}
      aria-label={`Roll ${label} ${sign(mod)}`}
      className={cn(
        "flex h-11 min-w-0 items-center justify-between gap-1 border px-2.5 text-xs transition-colors active:scale-[0.97] sm:h-9",
        marked
          ? "border-primary/50 bg-primary/10 text-foreground hover:bg-primary/20"
          : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      <span className="truncate">
        {label}
        {expert && <span className="ml-1 text-secondary">★</span>}
      </span>
      <span className="shrink-0 font-mono font-bold">{sign(mod)}</span>
    </button>
  );
}
