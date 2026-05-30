import { useState, useEffect } from "react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Input } from "@/core/components/ui/input";
import { RulesLookup } from "@/features/rules/components/RulesLookup";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Separator } from "@/core/components/ui/separator";
import { AbilityScoreBlock } from "./AbilityScoreBlock";
import { DerivedStatsBar } from "./DerivedStatsBar";
import { HPPanel } from "./HPPanel";
import { SkillsPanel } from "./SkillsPanel";
import { InventoryPanel } from "./InventoryPanel";
import { AttacksPanel } from "./AttacksPanel";
import { SpellsPanel } from "./SpellsPanel";
import { PersonalityPanel } from "./PersonalityPanel";
import { ProficienciesPanel } from "./ProficienciesPanel";
import { StatusPanel } from "./StatusPanel";
import { DefensesPanel } from "./DefensesPanel";
import { ResourcesPanel } from "./ResourcesPanel";
import { FeaturesPanel } from "./FeaturesPanel";
import { VoidPanel } from "./VoidPanel";
import { LevelUpWizard } from "./LevelUpWizard";
import { PortraitUpload } from "./PortraitUpload";
import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { LevelBadge } from "./LevelBadge";
import { finalAbilityScores, deriveStats, abilityModifier, passiveScore } from "../types/character.types";
import { suggestedAC, carryingCapacity, exhaustionSpeedPenalty, hasJackOfAllTrades, halfProficiencyBonus, computeArmorAC } from "../data/rules2024";
import type { ArmorItem } from "../data/rules2024";
import { resolveSpellcastingAbility } from "../data/dnd2024.constants";
import { useSpellSlots } from "../hooks/useSpellSlots";
import { supabase } from "@/lib/supabase";
import type { AbilityScores, AbilityName, CharacterWithScores, CharacterInventoryItem, CharacterAttack, CharacterSpell } from "../types/character.types";

const SAVING_THROW_ABILITIES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;

interface SavingThrowsCardProps {
  final: AbilityScores;
  proficiencyBonus: number;
  savingThrowProficiencies: string[];
  canEdit: boolean;
  characterId: string;
  onRefresh: () => void;
}

function SavingThrowsCard({ final, proficiencyBonus, savingThrowProficiencies, canEdit, characterId, onRefresh }: SavingThrowsCardProps) {
  const [busy, setBusy] = useState(false);
  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  async function toggle(ability: string) {
    if (!canEdit || busy) return;
    setBusy(true);
    const has = savingThrowProficiencies.includes(ability);
    const next = has
      ? savingThrowProficiencies.filter((a) => a !== ability)
      : [...savingThrowProficiencies, ability];
    await supabase.from("characters").update({ saving_throw_proficiencies: next }).eq("id", characterId);
    setBusy(false);
    onRefresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Saving Throw Proficiencies
          {canEdit && <span className="ml-2 normal-case font-normal text-muted-foreground/70">· click to toggle</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {SAVING_THROW_ABILITIES.map((ability) => {
            const isProficient = savingThrowProficiencies.includes(ability);
            const mod = abilityModifier(final[ability]) + (isProficient ? proficiencyBonus : 0);
            return (
              <Button
                key={ability}
                type="button"
                size="sm"
                variant="ghost"
                disabled={!canEdit || busy}
                onClick={() => toggle(ability)}
                className={`h-8 text-xs px-3 border transition-colors ${
                  canEdit ? "cursor-pointer hover:border-primary/60" : "cursor-default"
                } ${
                  isProficient ? "border-primary/60 bg-primary/10 text-primary" : "border-transparent bg-muted/40 text-muted-foreground"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isProficient ? "bg-primary" : "border border-muted-foreground/40"}`} />
                <span className="font-medium uppercase">{ability.slice(0, 3)}</span>
                <span className="font-bold">{sign(mod)}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  character: CharacterWithScores;
  inventory: CharacterInventoryItem[];
  attacks: CharacterAttack[];
  spells: CharacterSpell[];
  onRefreshInventory: () => void;
  onRefreshAttacks: () => void;
  onRefreshSpells: () => void;
  onRefreshCharacter: () => void;
  isOwn: boolean;
  isDM?: boolean;
  canEdit: boolean;
}

export function CharacterSheet({
  character, inventory, attacks, spells,
  onRefreshInventory, onRefreshAttacks, onRefreshSpells, onRefreshCharacter,
  isOwn, isDM, canEdit,
}: Props) {

  async function saveAbilityScore(ability: AbilityName, finalValue: number) {
    const scores = character.ability_scores;
    const primaryBonus  = scores?.background_bonus_primary   === ability ? 2 : 0;
    const secondaryBonus = scores?.background_bonus_secondary === ability ? 1 : 0;
    const newBase = finalValue - primaryBonus - secondaryBonus;
    await supabase
      .from("ability_scores")
      .update({ [ability]: Math.max(1, newBase) })
      .eq("character_id", character.id);
    onRefreshCharacter();
  }

  async function saveCharacterField(fields: Partial<Record<string, number>>) {
    await supabase.from("characters").update(fields).eq("id", character.id);
    onRefreshCharacter();
  }

  const [portraitUrl, setPortraitUrl] = useState(character.portrait_url);
  const [currency, setCurrency] = useState(character.currency_dollars);
  const [editingCurrency, setEditingCurrency] = useState(false);
  const [currencyDraft, setCurrencyDraft] = useState(String(character.currency_dollars));
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [armorRows, setArmorRows] = useState<ArmorItem[]>([]);

  // Load the SRD armor table once so AC can be derived from equipped armor.
  useEffect(() => {
    supabase.from("srd_armor").select("*").then(({ data }) => {
      if (data) setArmorRows(data as ArmorItem[]);
    });
  }, []);

  // Auto-open the wizard when level_up_pending becomes true for the owner.
  // Runs on mount (catches initial DB state) and on realtime updates.
  // Does not re-open if the user closes without finishing — deps only fire on a value change.
  useEffect(() => {
    if (character.level_up_pending && isOwn) {
      setLevelUpOpen(true);
    }
  }, [character.level_up_pending, isOwn]);

  const { slots, expend, recover, longRest: slotsLongRest } = useSpellSlots(
    character.id, character.class, character.level, character.subclass
  );

  const scores = character.ability_scores;
  const baseScores: AbilityScores = scores ?? {
    strength: 10, dexterity: 10, constitution: 10,
    intelligence: 10, wisdom: 10, charisma: 10,
  };
  const final = finalAbilityScores(
    baseScores,
    scores?.background_bonus_primary,
    scores?.background_bonus_secondary
  );
  const derived = deriveStats(final, character.level);

  // Spell stats
  const spellAbility = resolveSpellcastingAbility(character.class, character.spellcasting_ability);
  const spellAbilityMod = spellAbility
    ? abilityModifier(final[spellAbility as keyof AbilityScores] ?? 10)
    : 0;
  const spellAttackMod = spellAbility ? derived.proficiencyBonus + spellAbilityMod : 0;
  const spellSaveDc = spellAbility ? 8 + derived.proficiencyBonus + spellAbilityMod : 0;

  // Jack of All Trades (Bard 2+): half prof on non-proficient ability checks + initiative.
  const joat = hasJackOfAllTrades(character.class, character.level);
  const joatBonus = joat ? halfProficiencyBonus(derived.proficiencyBonus) : 0;
  const derivedDisplay = joat ? { ...derived, initiative: derived.initiative + joatBonus } : derived;

  // Passive scores — include proficiency and expertise (SRD: 10 + every modifier
  // that applies to the check).
  const passivePerception = passiveScore(final, derived.proficiencyBonus, "Perception", character.proficiencies, joat);
  const passiveInvestigation = passiveScore(final, derived.proficiencyBonus, "Investigation", character.proficiencies, joat);
  const passiveInsight = passiveScore(final, derived.proficiencyBonus, "Insight", character.proficiencies, joat);

  // AC suggestion (base 10+DEX, plus Unarmored Defense for Barbarian/Monk).
  const acSug = suggestedAC(final, character.class);

  // AC from equipped armor: match equipped inventory items against srd_armor.
  const normArmor = (s: string) => s.toLowerCase().replace(/\barmou?r\b/g, "").replace(/\s+/g, " ").trim();
  const armorByName = new Map(armorRows.map((a) => [normArmor(a.name), a]));
  const equippedArmor = inventory
    .filter((i) => i.is_equipped)
    .map((i) => armorByName.get(normArmor(i.item_name)))
    .filter((a): a is ArmorItem => !!a);
  const armorAC = equippedArmor.length ? computeArmorAC(equippedArmor, final, character.class) : null;

  // Armor Training: disadvantage on STR/DEX rolls (and can't cast) if wearing armor
  // whose category isn't in the character's armor proficiencies.
  const armorProfs = (character.armor_proficiencies ?? []).map((p) => p.toLowerCase());
  const bodyArmor = equippedArmor.find((a) => a.category !== "shield");
  const equippedShield = equippedArmor.find((a) => a.category === "shield");
  const armorNotProficient =
    (!!bodyArmor && !armorProfs.some((p) => p.includes(bodyArmor.category))) ||
    (!!equippedShield && !armorProfs.some((p) => p.includes("shield")));

  // Effective speed = base − exhaustion penalty, −10 ft for heavy armor whose
  // STR requirement isn't met, capped at 5 ft when over carrying capacity.
  const totalCarried = inventory.reduce((sum, i) => sum + (i.weight ?? 0) * i.quantity, 0);
  const carryCap = carryingCapacity(final.strength, character.size);
  const overEncumbered = totalCarried > carryCap;
  const exhaustSpeedPenalty = exhaustionSpeedPenalty(character.exhaustion);
  const armorStrPenalty = armorAC && armorAC.strengthShortfall > 0 ? -10 : 0;
  let effectiveSpeed = character.speed + exhaustSpeedPenalty + armorStrPenalty;
  if (overEncumbered) effectiveSpeed = Math.min(effectiveSpeed, 5);
  effectiveSpeed = Math.max(0, effectiveSpeed);
  const speedReasons = [
    overEncumbered ? "over capacity" : null,
    exhaustSpeedPenalty < 0 ? `exhaustion ${exhaustSpeedPenalty} ft` : null,
    armorStrPenalty < 0 ? "heavy armor STR −10 ft" : null,
  ].filter(Boolean).join(" · ");

  const concentrationSpells = spells.filter((s) => s.concentration).map((s) => s.name);

  async function saveCurrency() {
    const val = Math.max(0, parseInt(currencyDraft, 10) || 0);
    await supabase.from("characters").update({ currency_dollars: val }).eq("id", character.id);
    setCurrency(val);
    setEditingCurrency(false);
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-6">
        <div className="relative pb-10">
          {canEdit ? (
            <PortraitUpload
              characterId={character.id}
              portraitUrl={portraitUrl}
              name={character.name}
              onUpdated={setPortraitUrl}
            />
          ) : (
            <Avatar className="h-32 w-32 border-4 border-border">
              {portraitUrl && (
                <AvatarImage src={portraitUrl} alt={character.name} className="object-cover" />
              )}
              <AvatarFallback className="text-3xl">
                {character.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{character.name}</h1>
            <LevelBadge level={character.level} />
            <Badge
              variant={character.status === "active" ? "default" : "secondary"}
              className="capitalize"
            >
              {character.status}
            </Badge>
            {character.level_up_pending && isOwn && (
              <Button
                size="sm"
                variant="secondary"
                className="text-xs h-7"
                onClick={() => setLevelUpOpen(true)}
              >
                Level Up Available! →
              </Button>
            )}
            {character.level_up_pending && !isOwn && (
              <Badge variant="default" className="bg-yellow-500 text-black">
                Level Up Pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {character.species} {character.class}
            {character.subclass ? ` · ${character.subclass}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {character.background}
            {character.alignment ? ` · ${character.alignment}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs"
            onClick={() => setRulesOpen(true)}
          >
            Rules Reference
          </Button>
        </div>
      </div>

      {/* ── Derived Stats ── */}
      <DerivedStatsBar
        derived={derivedDisplay}
        ac={character.ac}
        speed={character.speed}
        level={character.level}
        passivePerception={passivePerception}
        passiveInvestigation={passiveInvestigation}
        passiveInsight={passiveInsight}
        canEdit={canEdit}
        onSaveAC={(v) => saveCharacterField({ ac: v })}
        onSaveSpeed={(v) => saveCharacterField({ speed: v })}
        onSaveLevel={(v) => saveCharacterField({ level: Math.max(1, Math.min(20, v)) })}
      />

      {/* AC suggestion + effective speed */}
      {(canEdit || effectiveSpeed !== character.speed) && (
        <div className="-mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          {canEdit && (armorAC ? (
            <span className="flex items-center gap-1.5">
              AC from armor <span className="font-semibold text-foreground">{armorAC.ac}</span>
              <span className="text-muted-foreground/70">({armorAC.label})</span>
              {character.ac !== armorAC.ac && (
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => saveCharacterField({ ac: armorAC.ac })}>
                  Use
                </Button>
              )}
              {armorAC.stealthDisadvantage && <span className="text-secondary">· Stealth disadv.</span>}
              {armorAC.strengthShortfall > 0 && <span className="text-destructive">· STR too low (−10 ft speed)</span>}
              {armorNotProficient && <span className="text-destructive">· Not proficient (disadvantage)</span>}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              Suggested AC <span className="font-semibold text-foreground">{acSug.base}</span>
              <span className="text-muted-foreground/70">(10 + DEX)</span>
              {character.ac !== acSug.base && (
                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => saveCharacterField({ ac: acSug.base })}>
                  Use
                </Button>
              )}
              {acSug.unarmoredValue != null && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  {acSug.unarmoredLabel} <span className="font-semibold text-foreground">{acSug.unarmoredValue}</span>
                  {character.ac !== acSug.unarmoredValue && (
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => saveCharacterField({ ac: acSug.unarmoredValue! })}>
                      Use
                    </Button>
                  )}
                </>
              )}
            </span>
          ))}
          {effectiveSpeed !== character.speed && (
            <span className="text-destructive">
              Effective Speed {effectiveSpeed} ft{speedReasons ? ` · ${speedReasons}` : ""}
            </span>
          )}
        </div>
      )}

      {/* ── HP & Death Saves ── */}
      <HPPanel
        character={character}
        constitutionScore={final.constitution}
        isOwn={isOwn}
        isDM={isDM}
        canEdit={canEdit}
        onSlotsLongRest={slotsLongRest}
        onSlotsShortRest={character.class.toLowerCase() === "warlock" ? slotsLongRest : undefined}
        onRefresh={onRefreshCharacter}
      />

      {/* ── Status & Conditions ── */}
      <StatusPanel
        character={character}
        canEdit={canEdit}
        concentrationSpells={concentrationSpells}
        onRefresh={onRefreshCharacter}
      />

      {/* ── Ability Scores ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ability Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AbilityScoreBlock
            scores={final}
            canEdit={canEdit}
            onSave={saveAbilityScore}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Includes +2/+1 from {character.background} background
            {canEdit && " · click any score to edit"}
          </p>
        </CardContent>
      </Card>

      {/* ── Skills ── */}
      <SkillsPanel
        finalScores={final}
        proficiencies={character.proficiencies}
        proficiencyBonus={derived.proficiencyBonus}
        halfProficiency={joat}
        canEdit={canEdit}
        characterId={character.id}
        onRefresh={onRefreshCharacter}
      />

      {/* ── Saving Throws ── */}
      <SavingThrowsCard
        final={final}
        proficiencyBonus={derived.proficiencyBonus}
        savingThrowProficiencies={character.saving_throw_proficiencies ?? []}
        canEdit={canEdit}
        characterId={character.id}
        onRefresh={onRefreshCharacter}
      />

      {/* ── Class Features & Traits ── */}
      <FeaturesPanel
        characterId={character.id}
        className={character.class}
        species={character.species}
        level={character.level}
        canEdit={canEdit}
      />

      {/* ── Class Resources ── */}
      <ResourcesPanel characterId={character.id} canEdit={canEdit} />

      {/* ── Proficiencies & Languages ── */}
      <ProficienciesPanel
        character={character}
        isOwn={canEdit}
        onRefresh={onRefreshCharacter}
      />

      {/* ── Defenses, Senses & Movement ── */}
      <DefensesPanel
        character={character}
        canEdit={canEdit}
        onRefresh={onRefreshCharacter}
        strengthScore={final.strength}
      />

      {/* ── Weapons & Damage Cantrips ── */}
      <Card>
        <CardContent className="pt-6">
          <AttacksPanel
            characterId={character.id}
            character={character}
            attacks={attacks}
            isOwn={canEdit}
            onRefresh={onRefreshAttacks}
          />
        </CardContent>
      </Card>

      {/* ── Cantrips & Prepared Spells ── */}
      <Card>
        <CardContent className="pt-6">
          <SpellsPanel
            characterId={character.id}
            characterClass={character.class}
            level={character.level}
            spellcastingAbility={spellAbility ?? null}
            spellAttackMod={spellAttackMod}
            spellSaveDc={spellSaveDc}
            spells={spells}
            slots={slots}
            expend={expend}
            recover={recover}
            isOwn={canEdit}
            onRefresh={onRefreshSpells}
          />
        </CardContent>
      </Card>

      {/* ── Inventory + Currency ── */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Currency
            </h4>
            {canEdit && !editingCurrency && (
              <Button variant="ghost" size="sm" onClick={() => {
                setCurrencyDraft(String(currency));
                setEditingCurrency(true);
              }}>
                Edit
              </Button>
            )}
          </div>
          {editingCurrency ? (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-success">$</span>
              <Input
                type="number"
                min={0}
                value={currencyDraft}
                onChange={(e) => setCurrencyDraft(e.target.value)}
                className="w-32 h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveCurrency();
                  if (e.key === "Escape") setEditingCurrency(false);
                }}
              />
              <Button size="sm" onClick={saveCurrency}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingCurrency(false)}>Cancel</Button>
            </div>
          ) : (
            <p className="text-2xl font-bold text-success">
              ${currency.toLocaleString()}
            </p>
          )}

          <Separator />

          <InventoryPanel
            characterId={character.id}
            items={inventory}
            onRefresh={onRefreshInventory}
            strengthScore={final.strength}
            size={character.size}
          />
        </CardContent>
      </Card>

      {/* ── Personality & Roleplay ── */}
      <PersonalityPanel
        character={character}
        isOwn={canEdit}
        onRefresh={onRefreshCharacter}
      />

      {/* ── Will of the Void ── */}
      <VoidPanel
        character={character}
        isOwn={isOwn}
        isDM={isDM}
        canEdit={canEdit}
        onRefresh={onRefreshCharacter}
      />

      <Separator />

      {isOwn && (
        <LevelUpWizard
          character={character}
          open={levelUpOpen}
          onClose={() => setLevelUpOpen(false)}
          onDone={() => { setLevelUpOpen(false); onRefreshCharacter(); }}
        />
      )}

      <RulesLookup open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
