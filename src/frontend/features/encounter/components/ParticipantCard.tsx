import type { ReactNode } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent } from "@/core/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Shield, Droplets, Brain, Crosshair } from "lucide-react";
import { HPAdjuster } from "./HPAdjuster";
import { ConditionBadges } from "./ConditionBadges";
import { DamageHealControl } from "./DamageHealControl";
import { cn } from "@/lib/utils";
import { COVER_OPTIONS, coverAcBonus } from "@/features/characters/data/rules2024";
import type { EncounterParticipant } from "../types/encounter.types";
import type { DamageResult } from "../hooks/useEncounterParticipants";
import { woundState } from "../lib/attack";

interface Props {
  participant: EncounterParticipant;
  isActive: boolean;
  canEditHP: boolean;
  showHP: boolean;
  showAC: boolean;
  onUpdateConditions: (conditions: string[]) => void;
  onApplyDamage?: (amount: number, type: string | null, opts?: { crit?: boolean }) => Promise<DamageResult>;
  onHeal?: (amount: number) => void;
  onRollDeathSave?: () => void;
  onSetConcentration?: (spell: string | null) => void;
  onSetCover?: (cover: string) => void;
  onClick?: () => void;
  /** Its panel is the one showing. Styled apart from `isActive` (whose turn). */
  selected?: boolean;
  /** This combatant is the viewer's current target. */
  isTarget?: boolean;
  /** Toggle targeting. Absent for viewers who cannot attack (spectators). */
  onTarget?: () => void;
}

const DODGE_HELP =
  "Dodging: attack rolls against this creature have disadvantage (if they can see the attacker) until the start of their next turn. They also have advantage on DEX saves.";

export function ParticipantCard(props: Props) {
  const { participant: p, isActive, canEditHP, selected, isTarget, onClick } = props;
  const downed = p.hp_current <= 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-md",
        isActive
          ? "bg-[var(--participant-active-bg)] hover:bg-[var(--participant-active-hover)]"
          : "hover:bg-accent",
        selected ? "border-primary" : "border-transparent",
        isTarget && "ring-1 ring-destructive/70",
      )}
      aria-current={isActive ? "step" : undefined}
      onClick={onClick}
      data-testid={`enc-participant:${p.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <CardHeader {...props} />
        <Health participant={p} showHP={props.showHP} />
        {p.dodging && (
          <Badge
            variant="outline"
            className="text-xs gap-1 border-primary/60 text-primary bg-primary/10"
            title={DODGE_HELP}
          >
            Dodging
          </Badge>
        )}
        {(p.conditions.length > 0 || canEditHP) && (
          <ConditionBadges
            conditions={p.conditions}
            canEdit={canEditHP}
            onUpdate={props.onUpdateConditions}
          />
        )}
        {canEditHP && <EditControls {...props} />}
        {p.is_player && downed && (
          <DeathSaves
            participant={p}
            onRoll={canEditHP ? props.onRollDeathSave : undefined}
          />
        )}
        {!p.is_player && downed && canEditHP && (
          <KnockOut participant={p} onUpdateConditions={props.onUpdateConditions} />
        )}
      </CardContent>
    </Card>
  );
}

/** Clicks inside don't select the card. */
function StopClick({ className, children, ...rest }: { className: string; children: ReactNode; "data-testid"?: string }) {
  const stop = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
  };
  return (
    <div role="presentation" className={className} onClick={stop} onKeyDown={stop} {...rest}>
      {children}
    </div>
  );
}

function CardHeader({ participant: p, isActive, showAC, isTarget, onTarget }: Props) {
  const coverBonus = coverAcBonus(p.cover);
  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          {p.portrait_url && <AvatarImage src={p.portrait_url} alt={p.name} />}
          <AvatarFallback className="text-xs">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        {isActive && (
          <span
            className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
            data-testid={`enc-participant-active:${p.id}`}
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{p.name}</span>
          {!p.is_player && <Badge variant="outline" className="text-xs">NPC</Badge>}
          {onTarget && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "ml-auto h-7 w-7 shrink-0",
                isTarget ? "text-destructive" : "text-muted-foreground",
              )}
              aria-pressed={isTarget}
              aria-label={isTarget ? `Stop targeting ${p.name}` : `Target ${p.name}`}
              title={isTarget ? "Stop targeting" : "Target"}
              onClick={(e) => {
                // Targeting is not selecting: keep the panel where it is.
                e.stopPropagation();
                onTarget();
              }}
            >
              <Crosshair className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {showAC && (
            <>
              <Shield className="h-3 w-3" />
              <span>
                {p.ac + coverBonus} AC
                {coverBonus > 0 && <span className="text-secondary"> (+{coverBonus})</span>}
              </span>
              {p.cover === "total" && <span className="text-secondary">· Total cover</span>}
              <span>·</span>
            </>
          )}
          <span>Init {p.initiative_score}</span>
        </div>
      </div>
    </div>
  );
}

/** Exact HP for those allowed to see it; otherwise only Bloodied or Down. */
function Health({ participant: p, showHP }: { participant: EncounterParticipant; showHP: boolean }) {
  if (showHP) {
    return <HPAdjuster current={p.hp_current} max={p.hp_max} testId={`enc-participant-hp:${p.id}`} />;
  }
  const wound = woundState(p);
  if (!wound) return null;
  return (
    <Badge
      variant="outline"
      className="text-xs gap-1 border-destructive/50 text-destructive bg-destructive/10"
    >
      <Droplets className="h-3 w-3" />
      {wound === "down" ? "Down" : "Bloodied"}
    </Badge>
  );
}

function EditControls({ participant: p, onApplyDamage, onHeal, onSetConcentration, onSetCover }: Props) {
  if (!onApplyDamage || !onHeal) return null;
  return (
    <StopClick className="flex items-center gap-1.5 flex-wrap">
      <DamageHealControl
        participant={p}
        onApplyDamage={onApplyDamage}
        onHeal={onHeal}
        onSetConcentration={onSetConcentration}
      />
      {onSetCover && (
        <Select value={p.cover} onValueChange={onSetCover}>
          <SelectTrigger className="h-6 w-[7.5rem] text-[10px] px-2" aria-label={`${p.name} cover`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COVER_OPTIONS.map((c) => (
              <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {p.concentrating_on && (
        <Badge variant="outline" className="text-[10px] gap-1">
          <Brain className="h-3 w-3" /> {p.concentrating_on}
        </Badge>
      )}
    </StopClick>
  );
}

const pips = (filled: number) => "●".repeat(filled) + "○".repeat(Math.max(0, 3 - filled));

function DeathSaves({ participant: p, onRoll }: { participant: EncounterParticipant; onRoll?: () => void }) {
  return (
    <StopClick
      className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs space-y-1.5"
      data-testid={`enc-participant-deathsaves:${p.id}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-semibold uppercase tracking-wide text-[10px]">Death Saves</span>
        {onRoll && (
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={onRoll}>
            Roll
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-success">S {pips(p.death_save_successes)}</span>
        <span className="text-destructive">F {pips(p.death_save_failures)}</span>
        {p.death_save_failures >= 3 && <span className="text-destructive font-semibold">Dead</span>}
        {p.death_save_successes >= 3 && <span className="text-success font-semibold">Stable</span>}
      </div>
    </StopClick>
  );
}

/**
 * Knock out vs kill: a creature dropped to 0 by a melee hit can be knocked
 * Unconscious (alive and stable) instead of killed (2024).
 */
function KnockOut({
  participant: p,
  onUpdateConditions,
}: {
  participant: EncounterParticipant;
  onUpdateConditions: (conditions: string[]) => void;
}) {
  const knockedOut = p.conditions.includes("Unconscious");
  return (
    <StopClick className="rounded-md border border-secondary/40 bg-secondary/5 p-2 text-xs flex items-center justify-between gap-2">
      {knockedOut ? (
        <>
          <span className="text-secondary font-medium">Knocked out — Unconscious &amp; stable</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={() => {
              onUpdateConditions(p.conditions.filter((c) => c !== "Unconscious"));
            }}
          >
            Undo
          </Button>
        </>
      ) : (
        <>
          <span className="text-muted-foreground">At 0 HP</span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={() => {
              onUpdateConditions([...p.conditions, "Unconscious"]);
            }}
            title="If reduced to 0 by a melee attack, you may knock the creature out (Unconscious, stable & alive) instead of killing it."
          >
            Knock out
          </Button>
        </>
      )}
    </StopClick>
  );
}
