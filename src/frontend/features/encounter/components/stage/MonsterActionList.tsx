import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { Separator } from "@/core/components/ui/separator";
import { Crosshair, Swords, Flame } from "lucide-react";
import type { MonsterAction, MonsterSpecialAbility } from "../../types/encounter.types";
import { renderInline } from "./renderInline";
import { parseDamageDice, sign } from "./combatantStats";
import type { CombatantView } from "./combatantView";

/** A monster's passive traits (special abilities). */
export function MonsterTraits({ traits }: { traits: MonsterSpecialAbility[] }) {
  if (traits.length === 0) return null;
  return (
    <>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Traits</p>
        <div className="space-y-2">
          {traits.map((trait, i) => (
            <div key={i} className="space-y-1 rounded-lg border bg-card/40 p-2.5">
              <span className="text-sm font-semibold">{trait.name}</span>
              {trait.desc && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {renderInline(trait.desc)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      <Separator />
    </>
  );
}

/** A monster's actions, each with To Hit, damage and crit buttons where it has them. */
export function MonsterActionList({ view }: { view: CombatantView }) {
  const actions = view.participant.actions ?? [];
  if (actions.length === 0) return null;
  return (
    <>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Actions</p>
        <div className="space-y-2">
          {actions.map((action, i) => (
            <MonsterActionCard key={i} action={action} view={view} />
          ))}
        </div>
      </div>
      <Separator />
    </>
  );
}

function MonsterActionCard({
  action,
  view,
}: {
  action: MonsterAction;
  view: CombatantView;
}) {
  const { rolls, stats, locked } = view;
  const { attackOpts, exhaustPenalty } = stats;
  const dice = action.damage_dice ? parseDamageDice(action.damage_dice) : null;
  const attackBonus = action.attack_bonus;

  return (
    <div className="space-y-2 rounded-lg border bg-card/60 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold">{action.name}</span>
        {action.damage_type && (
          <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
            {action.damage_type}
          </Badge>
        )}
      </div>
      {action.desc && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {renderInline(action.desc)}
        </p>
      )}
      {(attackBonus != null || dice) && (
        <div className="flex flex-wrap gap-1.5">
          {attackBonus != null && (
            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs"
              disabled={locked}
              onClick={() =>
                void rolls.rollD20(
                  attackBonus + exhaustPenalty,
                  `${action.name} Attack`,
                  attackOpts,
                )
              }
            >
              <Crosshair className="h-3.5 w-3.5 shrink-0" />
              To Hit {sign(attackBonus)}
              {attackOpts.advantage && <span className="font-bold">▲</span>}
              {attackOpts.disadvantage && <span className="font-bold">▼</span>}
            </Button>
          )}
          {dice && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 gap-1.5 text-xs"
              disabled={locked}
              onClick={() =>
                void rolls.doRoll(
                  `${dice.count}d${dice.sides}`,
                  dice.sides,
                  dice.mod,
                  `${action.name} Dmg`,
                )
              }
            >
              <Swords className="h-3.5 w-3.5 shrink-0" />
              {action.damage_dice}
            </Button>
          )}
          {dice && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5 px-2 text-xs"
              disabled={locked}
              onClick={() =>
                void rolls.doRoll(
                  `${dice.count * 2}d${dice.sides}`,
                  dice.sides,
                  dice.mod,
                  `${action.name} Crit`,
                )
              }
              title="Critical hit: double the damage dice"
            >
              <Flame className="h-3.5 w-3.5" /> Crit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
