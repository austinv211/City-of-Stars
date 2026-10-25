import { Button } from "@/core/components/ui/button";
import { Separator } from "@/core/components/ui/separator";
import { AttackCard } from "./AttackCard";
import type { CombatantView } from "./combatantView";

/** Every player's unarmed strike, with Grapple and Shove as its alternatives. */
export function UnarmedStrike({ view }: { view: CombatantView }) {
  const { participant, rolls, stats, locked } = view;
  const strength = stats.mods.strength;
  const toHit = strength + stats.profBonus + stats.exhaustPenalty;
  const noAction = locked || participant.action_used;

  return (
    <>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          Unarmed Strike
        </p>
        <AttackCard
          name="Unarmed Strike"
          typeLabel="Melee"
          damageType="bludgeoning"
          description="Deal 1 + STR modifier bludgeoning, or instead Grapple or Shove (the target makes a save vs your DC)."
          attackMod={toHit}
          damageLabel={`${1 + strength}`}
          disabled={locked}
          adjust={stats.condEffects.attackAdjust}
          onAttack={() =>
            void rolls.rollD20(toHit, "Unarmed Strike Attack", stats.attackOpts)
          }
          onDamage={() => void rolls.doRoll("1d1", 1, strength, "Unarmed Strike Dmg")}
          castControl={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                disabled={noAction}
                onClick={() => {
                  rolls.spendAction("Grapple (Unarmed Strike)", "action");
                }}
                title="Grapple: the target makes a Strength or Dexterity save (DC 8 + STR mod + proficiency) or is Grappled."
              >
                Grapple
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                disabled={noAction}
                onClick={() => {
                  rolls.spendAction("Shove (Unarmed Strike)", "action");
                }}
                title="Shove: the target makes a Strength or Dexterity save (DC 8 + STR mod + proficiency) or is pushed 5 ft or knocked Prone."
              >
                Shove
              </Button>
            </div>
          }
        />
      </div>
      <Separator />
    </>
  );
}
