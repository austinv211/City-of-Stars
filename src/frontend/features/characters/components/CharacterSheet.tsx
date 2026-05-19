import { useState, useEffect } from "react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
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
import { VoidPanel } from "./VoidPanel";
import { LevelUpWizard } from "./LevelUpWizard";
import { PortraitUpload } from "./PortraitUpload";
import { LevelBadge } from "./LevelBadge";
import { finalAbilityScores, deriveStats, abilityModifier } from "../types/character.types";
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
              <button
                key={ability}
                type="button"
                disabled={!canEdit || busy}
                onClick={() => toggle(ability)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs border transition-colors ${
                  canEdit ? "cursor-pointer hover:border-primary/60" : "cursor-default"
                } ${
                  isProficient ? "border-primary bg-primary/5" : "border-transparent bg-muted/40"
                } disabled:opacity-60`}
              >
                <span className={`w-2 h-2 rounded-full ${isProficient ? "bg-primary" : "border border-muted-foreground/40"}`} />
                <span className="font-medium uppercase">{ability.slice(0, 3)}</span>
                <span className="font-bold">{sign(mod)}</span>
              </button>
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
}

export function CharacterSheet({
  character, inventory, attacks, spells,
  onRefreshInventory, onRefreshAttacks, onRefreshSpells, onRefreshCharacter,
  isOwn, isDM,
}: Props) {
  const canEdit = isOwn || !!isDM;

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

  // Auto-open the wizard when level_up_pending becomes true for the owner.
  // Runs on mount (catches initial DB state) and on realtime updates.
  // Does not re-open if the user closes without finishing — deps only fire on a value change.
  useEffect(() => {
    if (character.level_up_pending && isOwn) {
      setLevelUpOpen(true);
    }
  }, [character.level_up_pending, isOwn]);

  const { slots, expend, recover, longRest: slotsLongRest } = useSpellSlots(
    character.id, character.class, character.level
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
  const spellAbility = character.spellcasting_ability;
  const spellAbilityMod = spellAbility
    ? abilityModifier(final[spellAbility as keyof AbilityScores] ?? 10)
    : 0;
  const spellAttackMod = spellAbility ? derived.proficiencyBonus + spellAbilityMod : 0;
  const spellSaveDc = spellAbility ? 8 + derived.proficiencyBonus + spellAbilityMod : 0;

  // Passive Investigation & Insight (with proficiency)
  const hasInvestigationProf = character.proficiencies.some((p) => p.skill === "Investigation");
  const hasInsightProf = character.proficiencies.some((p) => p.skill === "Insight");
  const passiveInvestigation =
    10 + abilityModifier(final.intelligence) + (hasInvestigationProf ? derived.proficiencyBonus : 0);
  const passiveInsight =
    10 + abilityModifier(final.wisdom) + (hasInsightProf ? derived.proficiencyBonus : 0);

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
            <div className="h-32 w-32 rounded-full border-4 border-border overflow-hidden bg-muted flex items-center justify-center text-3xl font-semibold">
              {character.name.slice(0, 2).toUpperCase()}
            </div>
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
              <button
                type="button"
                onClick={() => setLevelUpOpen(true)}
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition-colors cursor-pointer"
              >
                Level Up Available! →
              </button>
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
        derived={derived}
        ac={character.ac}
        speed={character.speed}
        level={character.level}
        passiveInvestigation={passiveInvestigation}
        passiveInsight={passiveInsight}
        canEdit={canEdit}
        onSaveAC={(v) => saveCharacterField({ ac: v })}
        onSaveSpeed={(v) => saveCharacterField({ speed: v })}
        onSaveLevel={(v) => saveCharacterField({ level: Math.max(1, Math.min(20, v)) })}
      />

      {/* ── HP & Death Saves ── */}
      <HPPanel
        character={character}
        constitutionScore={final.constitution}
        isOwn={isOwn}
        isDM={isDM}
        onSlotsLongRest={slotsLongRest}
        onSlotsShortRest={character.class.toLowerCase() === "warlock" ? slotsLongRest : undefined}
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

      {/* ── Proficiencies & Languages ── */}
      <ProficienciesPanel
        character={character}
        isOwn={canEdit}
        onRefresh={onRefreshCharacter}
      />

      {/* ── Weapons & Damage Cantrips ── */}
      <Card>
        <CardContent className="pt-6">
          <AttacksPanel
            characterId={character.id}
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
              <span className="text-lg font-bold text-green-600">$</span>
              <input
                type="number"
                min={0}
                value={currencyDraft}
                onChange={(e) => setCurrencyDraft(e.target.value)}
                className="w-32 rounded border px-2 py-1 text-sm"
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
            <p className="text-2xl font-bold text-green-600">
              ${currency.toLocaleString()}
            </p>
          )}

          <Separator />

          <InventoryPanel
            characterId={character.id}
            items={inventory}
            onRefresh={onRefreshInventory}
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
