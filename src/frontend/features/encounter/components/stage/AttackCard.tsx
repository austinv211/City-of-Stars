import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/core/components/ui/tooltip";
import { Crosshair, Swords, Flame, Hand, Axe } from "lucide-react";
import { MASTERY_INFO } from "@/features/characters/data/rules2024";
import { renderInline } from "./renderInline";
import { sign } from "./combatantStats";

/**
 * One attack or damaging spell: aim (To Hit) and deal damage, plus the
 * variants that apply -- crit, versatile two-handed, off-hand, Cleave -- and an
 * optional slot-casting control.
 */
export function AttackCard({
  name,
  typeLabel,
  damageType,
  description,
  attackMod,
  damageLabel,
  disabled,
  adjust = "none",
  mastery,
  onAttack,
  onDamage,
  onCritDamage,
  onVersatileDamage,
  versatileLabel,
  onOffhandDamage,
  onCleaveDamage,
  castControl,
  outcome,
}: {
  name: string;
  typeLabel: string;
  damageType: string;
  description: string | null;
  attackMod: number | null;
  damageLabel: string;
  disabled: boolean;
  adjust?: "advantage" | "disadvantage" | "none";
  mastery?: string | null;
  onAttack: () => void;
  onDamage: () => void;
  onCritDamage?: () => void;
  onVersatileDamage?: () => void;
  versatileLabel?: string;
  onOffhandDamage?: () => void;
  onCleaveDamage?: () => void;
  castControl?: React.ReactNode;
  /** What the last roll means against the current target. */
  outcome?: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-card/60 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
        <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
          {typeLabel}
        </Badge>
        {damageType && (
          <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
            {damageType}
          </Badge>
        )}
        {mastery && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="shrink-0 cursor-help bg-primary/15 text-[10px] text-primary underline decoration-primary/60 decoration-dotted underline-offset-2"
              >
                {mastery}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs leading-relaxed">
              <span className="font-semibold">{mastery}.</span>{" "}
              {MASTERY_INFO[mastery as keyof typeof MASTERY_INFO]}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {description && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {renderInline(description)}
        </p>
      )}
      {/* Primary actions: aim (To Hit) + deal damage, colour-coded. */}
      <div className="flex gap-1.5">
        {attackMod !== null && (
          <Button
            size="sm"
            variant="default"
            className="h-8 flex-1 gap-1.5 text-xs"
            disabled={disabled}
            onClick={onAttack}
          >
            <Crosshair className="h-3.5 w-3.5 shrink-0" />
            To Hit {sign(attackMod)}
            {adjust === "advantage" && <span className="font-bold">▲</span>}
            {adjust === "disadvantage" && <span className="font-bold">▼</span>}
          </Button>
        )}
        <Button
          size="sm"
          variant="destructive"
          className="h-8 flex-1 gap-1.5 text-xs"
          disabled={disabled}
          onClick={onDamage}
        >
          <Swords className="h-3.5 w-3.5 shrink-0" />
          {damageLabel}
        </Button>
      </div>
      {/* Damage variants & extra attacks — tinted by family: red for damage
          variations of this swing (Crit/2H), neutral for separate attacks
          (Off-hand/Cleave). All clearly readable as buttons. */}
      {(onVersatileDamage || onCritDamage || onOffhandDamage || onCleaveDamage) && (
        <div className="flex flex-wrap gap-1.5">
          {onCritDamage && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 px-2 text-xs"
              disabled={disabled}
              onClick={onCritDamage}
              title="Critical hit: double the damage dice"
            >
              <Flame className="h-3.5 w-3.5" /> Crit
            </Button>
          )}
          {onVersatileDamage && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 px-2 text-xs"
              disabled={disabled}
              onClick={onVersatileDamage}
              title="Two-handed (versatile) damage"
            >
              <Swords className="h-3.5 w-3.5" /> 2H {versatileLabel}
            </Button>
          )}
          {onOffhandDamage && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 px-2 text-xs"
              disabled={disabled}
              onClick={onOffhandDamage}
              title="Two-Weapon Fighting off-hand attack: weapon dice with no ability modifier (unless you have the Two-Weapon Fighting style)"
            >
              <Hand className="h-3.5 w-3.5" /> Off-hand
            </Button>
          )}
          {onCleaveDamage && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 px-2 text-xs"
              disabled={disabled}
              onClick={onCleaveDamage}
              title="Cleave: damage a second creature within 5 ft (weapon dice, no ability modifier)"
            >
              <Axe className="h-3.5 w-3.5" /> Cleave
            </Button>
          )}
        </div>
      )}
      {castControl}
      {outcome}
    </div>
  );
}
