import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Textarea } from "@/core/components/ui/textarea";
import { Separator } from "@/core/components/ui/separator";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { AbilityScoreBlock } from "./AbilityScoreBlock";
import { DerivedStatsBar } from "./DerivedStatsBar";
import { ProficiencyList } from "./ProficiencyList";
import { InventoryPanel } from "./InventoryPanel";
import { AttacksPanel } from "./AttacksPanel";
import { SpellsPanel } from "./SpellsPanel";
import { PortraitUpload } from "./PortraitUpload";
import { LevelBadge } from "./LevelBadge";
import { finalAbilityScores, deriveStats } from "../types/character.types";
import { CLASSES } from "../data/dnd2024.constants";
import { supabase } from "@/lib/supabase";
import type { AbilityScores, CharacterWithScores, CharacterInventoryItem, CharacterAttack, CharacterSpell } from "../types/character.types";
import { abilityModifier } from "../types/character.types";

interface Props {
  character: CharacterWithScores;
  inventory: CharacterInventoryItem[];
  attacks: CharacterAttack[];
  spells: CharacterSpell[];
  onRefreshInventory: () => void;
  onRefreshAttacks: () => void;
  onRefreshSpells: () => void;
  isOwn: boolean;
}

export function CharacterSheet({ character, inventory, attacks, spells, onRefreshInventory, onRefreshAttacks, onRefreshSpells, isOwn }: Props) {
  const [backstory, setBackstory] = useState(character.backstory ?? "");
  const [editingBackstory, setEditingBackstory] = useState(false);
  const [savingBackstory, setSavingBackstory] = useState(false);
  const [portraitUrl, setPortraitUrl] = useState(character.portrait_url);
  const [currency, setCurrency] = useState(character.currency_dollars);
  const [editingCurrency, setEditingCurrency] = useState(false);
  const [currencyDraft, setCurrencyDraft] = useState(String(character.currency_dollars));

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

  const classData = CLASSES.find((c) => c.name === character.class);

  // Spell stats
  const spellAbility = character.spellcasting_ability;
  const spellAbilityMod = spellAbility
    ? abilityModifier(final[spellAbility as keyof AbilityScores] ?? 10)
    : 0;
  const spellAttackMod = spellAbility ? derived.proficiencyBonus + spellAbilityMod : 0;
  const spellSaveDc = spellAbility ? 8 + derived.proficiencyBonus + spellAbilityMod : 0;

  async function saveBackstory() {
    setSavingBackstory(true);
    await supabase.from("characters").update({ backstory }).eq("id", character.id);
    setSavingBackstory(false);
    setEditingBackstory(false);
  }

  async function saveCurrency() {
    const val = Math.max(0, parseInt(currencyDraft, 10) || 0);
    await supabase.from("characters").update({ currency_dollars: val }).eq("id", character.id);
    setCurrency(val);
    setEditingCurrency(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        <div className="relative pb-10">
          {isOwn ? (
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
          </div>
          <p className="text-muted-foreground mt-1">
            {character.species} {character.class}
            {character.subclass ? ` · ${character.subclass}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {character.background}
            {character.alignment ? ` · ${character.alignment}` : ""}
          </p>
          {character.is_locked && (
            <p className="text-xs text-amber-600 mt-1">
              Stats locked — campaign in progress
            </p>
          )}
        </div>
      </div>

      {/* Derived stats */}
      <DerivedStatsBar derived={derived} />

      {/* Ability Scores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ability Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AbilityScoreBlock scores={final} />
          <p className="text-xs text-muted-foreground mt-2">
            Includes +2/+1 from {character.background} background
          </p>
        </CardContent>
      </Card>

      {/* Proficiencies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Proficiencies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProficiencyList
            proficiencies={character.proficiencies}
            savingThrows={classData?.savingThrows ?? []}
          />
        </CardContent>
      </Card>

      {/* Attacks */}
      <Card>
        <CardContent className="pt-6">
          <AttacksPanel
            characterId={character.id}
            attacks={attacks}
            isOwn={isOwn}
            onRefresh={onRefreshAttacks}
          />
        </CardContent>
      </Card>

      {/* Spells */}
      <Card>
        <CardContent className="pt-6">
          <SpellsPanel
            characterId={character.id}
            spellcastingAbility={spellAbility ?? null}
            spellAttackMod={spellAttackMod}
            spellSaveDc={spellSaveDc}
            spells={spells}
            isOwn={isOwn}
            onRefresh={onRefreshSpells}
          />
        </CardContent>
      </Card>

      {/* Inventory + Currency */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Currency row */}
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Currency
            </h4>
            {isOwn && !editingCurrency && (
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
              <Input
                type="number"
                min={0}
                value={currencyDraft}
                onChange={(e) => setCurrencyDraft(e.target.value)}
                className="w-32"
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

      {/* Backstory */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Backstory
            </CardTitle>
            {isOwn && !editingBackstory && (
              <Button variant="ghost" size="sm" onClick={() => setEditingBackstory(true)}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingBackstory ? (
            <div className="space-y-3">
              <Textarea
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                rows={6}
                placeholder="Write your character's backstory…"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveBackstory} disabled={savingBackstory}>
                  {savingBackstory ? "Saving…" : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setBackstory(character.backstory ?? "");
                    setEditingBackstory(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : backstory ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{backstory}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No backstory written yet.{isOwn ? " Click Edit to add one." : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />
    </div>
  );
}
