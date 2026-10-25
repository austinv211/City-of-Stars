import { Separator } from "@/core/components/ui/separator";
import { useSpellSlots } from "@/features/characters/hooks/useSpellSlots";
import type {
  CharacterAttack,
  CharacterSpell,
  CharacterSpellSlot,
} from "@/features/characters/types/character.types";
import { useDamageSpells, useSpellDescriptions } from "../../hooks/useCombatantSpells";
import { AttackCard } from "./AttackCard";
import { AttackOutcome } from "./AttackOutcome";
import { useAttackOutcome } from "./useAttackOutcome";
import { SpellSlotCast } from "./SpellSlotCast";
import { parseDamageDice, sign } from "./combatantStats";
import type { CombatantView } from "./combatantView";

/** Weapon attacks and damaging spells, each as an AttackCard. */
export function AttackCardList({
  view,
  attacks,
}: {
  view: CombatantView;
  attacks: CharacterAttack[];
}) {
  const { participant, character } = view;
  const damageSpells = useDamageSpells(participant.character_id);
  // Custom notes win; otherwise spell attacks read the parsed SRD description.
  const spellDesc = useSpellDescriptions(
    attacks.filter((a) => a.is_spell).map((a) => a.name),
  );
  // One slots subscription for the whole list, shared by every leveled spell's
  // cast control. NPCs (no character) yield no slots.
  const { slots, expend } = useSpellSlots(
    participant.character_id ?? "",
    character?.class ?? "",
    character?.level ?? 1,
    character?.subclass ?? null,
  );

  if (attacks.length === 0 && damageSpells.length === 0) return null;

  return (
    <>
      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">Attacks</p>
        <div className="space-y-2">
          {attacks.map((atk) => (
            <WeaponAttack
              key={atk.id}
              atk={atk}
              view={view}
              description={atk.notes || spellDesc.get(atk.name.toLowerCase()) || null}
            />
          ))}
          {damageSpells.map((spell) => (
            <DamageSpell
              key={spell.id}
              spell={spell}
              view={view}
              slots={slots}
              onExpend={(lvl) => void expend(lvl)}
            />
          ))}
        </div>
      </div>
      <Separator />
    </>
  );
}

function WeaponAttack({
  atk,
  view,
  description,
}: {
  atk: CharacterAttack;
  view: CombatantView;
  description: string | null;
}) {
  const { rolls, stats, locked } = view;
  const outcome = useAttackOutcome();
  const { attackMod, damageMod, diceCount } = stats.attackRoll(atk);
  const toHit = attackMod + stats.exhaustPenalty;
  const dice = `${diceCount}d${atk.dice_sides}`;
  // Off-hand and Cleave deal weapon dice without the positive ability
  // modifier (a negative modifier still applies, per 2024).
  const noPosMod = Math.min(0, damageMod);
  const versatile = atk.versatile_sides;
  const damage =
    (diceExpr: string, sides: number, mod: number, label: string, crit = false) =>
    () => {
      outcome.deal(rolls.doRoll(diceExpr, sides, mod, `${atk.name} ${label}`), crit);
    };

  return (
    <AttackCard
      name={atk.name}
      typeLabel={atk.is_spell ? "Spell" : atk.is_ranged ? "Ranged" : "Melee"}
      damageType={atk.damage_type}
      description={description}
      attackMod={toHit}
      damageLabel={`${dice}${damageMod ? sign(damageMod) : ""}`}
      disabled={locked}
      adjust={stats.condEffects.attackAdjust}
      mastery={atk.mastery}
      versatileLabel={versatile ? `d${versatile}` : undefined}
      onAttack={() => {
        outcome.aim(
          rolls.rollD20(toHit, `${atk.name} Attack`, stats.attackOpts),
          toHit,
        );
      }}
      onDamage={damage(dice, atk.dice_sides, damageMod, "Dmg")}
      onCritDamage={damage(
        `${diceCount * 2}d${atk.dice_sides}`,
        atk.dice_sides,
        damageMod,
        "Crit",
        true,
      )}
      onVersatileDamage={
        versatile
          ? damage(`${diceCount}d${versatile}`, versatile, damageMod, "2H Dmg")
          : undefined
      }
      onOffhandDamage={
        atk.is_light && !atk.is_spell
          ? damage(dice, atk.dice_sides, noPosMod, "Off-hand Dmg")
          : undefined
      }
      onCleaveDamage={
        atk.mastery === "Cleave"
          ? damage(dice, atk.dice_sides, noPosMod, "Cleave Dmg")
          : undefined
      }
      outcome={
        <AttackOutcome
          outcome={outcome}
          target={view.target}
          damageType={atk.damage_type}
          onApplyDamage={view.onApplyDamage}
        />
      }
    />
  );
}

function DamageSpell({
  spell,
  view,
  slots,
  onExpend,
}: {
  spell: CharacterSpell;
  view: CombatantView;
  slots: CharacterSpellSlot[];
  onExpend: (level: number) => void;
}) {
  const { participant, character, rolls, stats, locked } = view;
  const outcome = useAttackOutcome();
  const { count, sides, mod } = parseDamageDice(spell.damage_dice ?? "");
  // Cantrips (level 0) scale their dice with character level.
  const dmgCount = spell.level === 0 && character ? count * stats.cantripMult : count;
  const toHit = stats.spellAtkMod + stats.exhaustPenalty;

  return (
    <AttackCard
      name={spell.name}
      typeLabel={spell.level === 0 ? "Cantrip" : "Spell"}
      damageType={spell.damage_type ?? ""}
      description={spell.description || null}
      attackMod={spell.attack_type ? toHit : null}
      damageLabel={`${dmgCount}d${sides}${mod ? sign(mod) : ""}`}
      disabled={locked}
      adjust={stats.condEffects.attackAdjust}
      onAttack={() => {
        outcome.aim(
          rolls.rollD20(toHit, `${spell.name} Attack`, stats.attackOpts),
          toHit,
        );
      }}
      onDamage={() => {
        outcome.deal(
          rolls.doRoll(`${dmgCount}d${sides}`, sides, mod, `${spell.name} Dmg`),
          false,
        );
      }}
      onCritDamage={() => {
        outcome.deal(
          rolls.doRoll(`${dmgCount * 2}d${sides}`, sides, mod, `${spell.name} Crit`),
          true,
        );
      }}
      castControl={
        participant.is_player && spell.level > 0 ? (
          <SpellSlotCast
            minLevel={spell.level}
            slots={slots}
            disabled={locked}
            onExpend={onExpend}
          />
        ) : undefined
      }
      outcome={
        <AttackOutcome
          outcome={outcome}
          target={view.target}
          damageType={spell.damage_type ?? ""}
          onApplyDamage={view.onApplyDamage}
        />
      }
    />
  );
}
