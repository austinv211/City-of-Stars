import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/core/components/ui/avatar";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent } from "@/core/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Shield, Droplets, Brain } from "lucide-react";
import { HPAdjuster } from "./HPAdjuster";
import { ConditionBadges } from "./ConditionBadges";
import { DamageHealControl } from "./DamageHealControl";
import { cn } from "@/lib/utils";
import { COVER_OPTIONS, coverAcBonus } from "@/features/characters/data/rules2024";
import type { EncounterParticipant } from "../types/encounter.types";
import type { DamageResult } from "../hooks/useEncounterParticipants";

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
  selected?: boolean;
}

export function ParticipantCard({
  participant,
  isActive,
  canEditHP,
  showHP,
  showAC,
  onUpdateConditions,
  onApplyDamage,
  onHeal,
  onRollDeathSave,
  onSetConcentration,
  onSetCover,
  onClick,
  selected,
}: Props) {
  const initials = participant.name.slice(0, 2).toUpperCase();
  const coverBonus = coverAcBonus(participant.cover);
  const effectiveAC = participant.ac + coverBonus;
  const isDownedPlayer = participant.is_player && participant.hp_current <= 0;

  const cardStyle: Record<string, string> = {};
  if (selected) {
    cardStyle["background"] = "color-mix(in oklch, var(--accent-turn) 20%, transparent)";
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300",
        selected
          ? "border-primary"
          : isActive
          ? "border-transparent bg-[var(--participant-active-bg)] hover:bg-[var(--participant-active-hover)] hover:shadow-md"
          : "border-transparent hover:bg-accent hover:shadow-md",
      )}
      style={cardStyle}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              {participant.portrait_url && (
                <AvatarImage src={participant.portrait_url} alt={participant.name} />
              )}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{participant.name}</span>
              {!participant.is_player && (
                <Badge variant="outline" className="text-xs">NPC</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {showAC && (
                <>
                  <Shield className="h-3 w-3" />
                  <span>
                    {effectiveAC} AC
                    {coverBonus > 0 && <span className="text-secondary"> (+{coverBonus})</span>}
                  </span>
                  {participant.cover === "total" && <span className="text-secondary">· Total cover</span>}
                  <span>·</span>
                </>
              )}
              <span>Init {participant.initiative_score}</span>
            </div>
          </div>
        </div>

        {showHP ? (
          <HPAdjuster current={participant.hp_current} max={participant.hp_max} />
        ) : participant.hp_max > 0 && participant.hp_current * 2 <= participant.hp_max ? (
          <Badge
            variant="outline"
            className="text-xs gap-1 border-destructive/50 text-destructive bg-destructive/10"
          >
            <Droplets className="h-3 w-3" />
            Bloodied
          </Badge>
        ) : null}

        {participant.dodging && (
          <Badge
            variant="outline"
            className="text-xs gap-1 border-primary/60 text-primary bg-primary/10"
            title="Dodging: attack rolls against this creature have disadvantage (if they can see the attacker) until the start of their next turn. They also have advantage on DEX saves."
          >
            Dodging
          </Badge>
        )}

        {participant.conditions.length > 0 || canEditHP ? (
          <ConditionBadges
            conditions={participant.conditions}
            canEdit={canEditHP}
            onUpdate={onUpdateConditions}
          />
        ) : null}

        {canEditHP && onApplyDamage && onHeal && (
          <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <DamageHealControl
              participant={participant}
              onApplyDamage={onApplyDamage}
              onHeal={onHeal}
              onSetConcentration={onSetConcentration}
            />
            {onSetCover && (
              <Select value={participant.cover} onValueChange={(v) => onSetCover(v)}>
                <SelectTrigger className="h-6 w-[7.5rem] text-[10px] px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COVER_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {participant.concentrating_on && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Brain className="h-3 w-3" /> {participant.concentrating_on}
              </Badge>
            )}
          </div>
        )}

        {isDownedPlayer && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold uppercase tracking-wide text-[10px]">Death Saves</span>
              {canEditHP && onRollDeathSave && (
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onRollDeathSave()}>
                  Roll
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-success">S {"●".repeat(participant.death_save_successes)}{"○".repeat(Math.max(0, 3 - participant.death_save_successes))}</span>
              <span className="text-destructive">F {"●".repeat(participant.death_save_failures)}{"○".repeat(Math.max(0, 3 - participant.death_save_failures))}</span>
              {participant.death_save_failures >= 3 && <span className="text-destructive font-semibold">Dead</span>}
              {participant.death_save_successes >= 3 && <span className="text-success font-semibold">Stable</span>}
            </div>
          </div>
        )}

        {/* Knock out vs kill — a creature dropped to 0 by a melee hit can be
            knocked Unconscious (alive & stable) instead of killed (2024). */}
        {!participant.is_player && participant.hp_current <= 0 && canEditHP && (
          <div
            className="rounded-md border border-secondary/40 bg-secondary/5 p-2 text-xs flex items-center justify-between gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {participant.conditions.includes("Unconscious") ? (
              <>
                <span className="text-secondary font-medium">Knocked out — Unconscious &amp; stable</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => onUpdateConditions(participant.conditions.filter((c) => c !== "Unconscious"))}
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
                  onClick={() => onUpdateConditions([...participant.conditions, "Unconscious"])}
                  title="If reduced to 0 by a melee attack, you may knock the creature out (Unconscious, stable & alive) instead of killing it."
                >
                  Knock out
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
