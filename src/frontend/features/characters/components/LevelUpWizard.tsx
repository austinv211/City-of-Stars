import { useEffect, useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/core/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Separator } from "@/core/components/ui/separator";
import {
  getClassLevel,
  getFeats,
  getLocalClassFeatures,
  getLocalFeats,
  getClassFeatureDetails,
  type SrdFeatureDetail,
} from "@/lib/dnd5eApi";
import { isAsiLevel, isEpicBoonLevel, useLevelUp } from "../hooks/useLevelUp";
import { slotsForClass } from "../hooks/useSpellSlots";
import { abilityModifier, finalAbilityScores } from "../types/character.types";
import { CLASSES, resolveSpellcastingAbility } from "../data/dnd2024.constants";
import type { CharacterWithScores, AbilityName } from "../types/character.types";

interface Props {
  character: CharacterWithScores;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

const ABILITY_LABELS: Record<AbilityName, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const ABILITIES: AbilityName[] = [
  "strength", "dexterity", "constitution",
  "intelligence", "wisdom", "charisma",
];

type AsiMode = "+2" | "+1+1" | "feat";

const SLOT_LEVEL_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];

// ── Feature popover ────────────────────────────────────────────────────────

function FeatureItem({
  name,
  detailMap,
}: {
  name: string;
  detailMap: Map<string, SrdFeatureDetail>;
}) {
  const detail = detailMap.get(name.toLowerCase());
  if (!detail) {
    return (
      <li className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        <span className="text-sm font-medium">{name}</span>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-0.5" />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="text-sm font-medium text-left hover:text-primary hover:underline underline-offset-2 transition-colors"
          >
            {name}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-h-72 overflow-y-auto text-xs leading-relaxed space-y-1 p-3">
          <p className="font-semibold text-sm mb-1">{name}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{detail.description}</p>
        </PopoverContent>
      </Popover>
    </li>
  );
}

// ── Spell slot grid ────────────────────────────────────────────────────────

function SpellSlotGrid({ slots, level, abilityLabel }: { slots: number[]; level: number; abilityLabel?: string | null }) {
  const hasAny = slots.some((s) => s > 0);
  if (!hasAny) return null;

  return (
    <div className="mt-3 rounded-md bg-muted/40 p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        Spell Slots at Level {level}
        {abilityLabel && (
          <span className="ml-2 font-normal normal-case">
            ({abilityLabel})
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {slots.map((count, i) =>
          count > 0 ? (
            <div
              key={i}
              className="flex flex-col items-center rounded border bg-card px-2 py-1 min-w-[36px]"
            >
              <span className="text-[10px] text-muted-foreground leading-none">{SLOT_LEVEL_LABELS[i]}</span>
              <span className="text-base font-bold leading-tight">{count}</span>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

// ── Feat detail popover ────────────────────────────────────────────────────

function FeatSelect({
  featList,
  value,
  onChange,
}: {
  featList: { index: string; name: string; description?: string; prerequisite?: string | null; category?: string | null }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = featList.find((f) => f.name === value);

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="— Select a feat —" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {featList.map((f) => (
            <SelectItem key={f.index} value={f.name}>
              {f.name}
              {f.prerequisite ? ` (Req: ${f.prerequisite})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected?.description && (
        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto">
          {selected.category && (
            <span className="font-semibold text-foreground mr-1">{selected.category} Feat.</span>
          )}
          {selected.prerequisite && (
            <span className="text-amber-600 dark:text-amber-400 mr-1">
              Prerequisite: {selected.prerequisite}.
            </span>
          )}
          <span className="whitespace-pre-wrap">{selected.description}</span>
        </div>
      )}
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────

export function LevelUpWizard({ character, open, onClose, onDone }: Props) {
  const { commitLevelUp, loading, error } = useLevelUp(character);

  const targetLevel = character.level + 1;

  const classData = CLASSES.find((c) => c.name === character.class);
  const hitDie = classData?.hitDie ?? 8;
  const scores = character.ability_scores;
  const base = scores ?? { strength:10, dexterity:10, constitution:10, intelligence:10, wisdom:10, charisma:10 };
  const final = finalAbilityScores(base, scores?.background_bonus_primary, scores?.background_bonus_secondary);
  const conMod = abilityModifier(final.constitution);
  const avgHp = Math.floor(hitDie / 2) + 1 + conMod;

  const hasAsi = isAsiLevel(character.class, targetLevel);
  const isEpicBoon = isEpicBoonLevel(targetLevel);
  // Step 1 covers both a normal ASI and the level-19 Epic Boon (feat-only) choice.
  const showImprovementStep = hasAsi || isEpicBoon;
  const steps = showImprovementStep ? [0, 1, 2, 3] : [0, 2, 3];
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];

  // API/DB data
  const [features, setFeatures] = useState<{ name: string; index: string }[]>([]);
  const [featDetailMap, setFeatDetailMap] = useState<Map<string, SrdFeatureDetail>>(new Map());
  const [featList, setFeatList] = useState<{ index: string; name: string; description?: string; prerequisite?: string | null; category?: string | null }[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);

  // Choices
  const [asiMode, setAsiMode] = useState<AsiMode>("+2");
  const [asiSingle, setAsiSingle] = useState<AbilityName>("strength");
  const [asiA, setAsiA] = useState<AbilityName>("strength");
  const [asiB, setAsiB] = useState<AbilityName>("dexterity");
  const [featChoice, setFeatChoice] = useState<string>("");
  const [hpMethod, setHpMethod] = useState<"roll" | "average">("average");
  const [rolledHp, setRolledHp] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setRolledHp(null);
    // An Epic Boon is always a feat — there is no +2/+1+1 option at level 19.
    setAsiMode(isEpicBoon ? "feat" : "+2");
    setFeatChoice("");
  }, [open, isEpicBoon]);

  useEffect(() => {
    if (!open) return;
    setLoadingApi(true);

    async function loadAll() {
      // Features for the level being gained
      const localFeatures = await getLocalClassFeatures(character.class, targetLevel);
      if (localFeatures.length > 0) {
        setFeatures(localFeatures);
      } else {
        const levelData = await getClassLevel(character.class.toLowerCase(), targetLevel);
        setFeatures(levelData?.features ?? []);
      }

      // All feature descriptions for this class (to populate popovers)
      const details = await getClassFeatureDetails(character.class);
      const map = new Map<string, SrdFeatureDetail>();
      for (const d of details) {
        map.set(d.feature_name.toLowerCase(), d);
      }
      setFeatDetailMap(map);

      // Feats (for an ASI level or the level-19 Epic Boon)
      if (showImprovementStep) {
        let list: { index: string; name: string; description?: string; prerequisite?: string | null; category?: string | null }[];
        const localFeats = await getLocalFeats();
        if (localFeats.length > 0) {
          list = localFeats.map((f) => ({
            index: f.index,
            name: f.name,
            description: f.description,
            prerequisite: f.prerequisite,
            category: f.category,
          }));
        } else {
          list = (await getFeats()) as { index: string; name: string }[];
        }
        // At level 19 restrict the picker to Epic Boon feats ("Boon of …").
        if (isEpicBoon) {
          const boons = list.filter((f) => f.name.startsWith("Boon of"));
          if (boons.length > 0) list = boons;
        }
        setFeatList(list);
      }
    }

    loadAll().finally(() => setLoadingApi(false));
  }, [open, character.class, targetLevel, showImprovementStep, isEpicBoon]);

  function rollHitDie() {
    const roll = Math.floor(Math.random() * hitDie) + 1;
    setRolledHp(Math.max(1, roll + conMod));
    setHpMethod("roll");
  }

  function resolvedHpGain(): number {
    if (hpMethod === "roll" && rolledHp !== null) return rolledHp;
    return Math.max(1, avgHp);
  }

  function resolvedAsiBonus(): Partial<Record<AbilityName, number>> {
    if (!hasAsi || asiMode === "feat") return {};
    if (asiMode === "+2") return { [asiSingle]: 2 };
    return { [asiA]: 1, [asiB]: 1 };
  }

  async function finish() {
    await commitLevelUp({
      hpGain: resolvedHpGain(),
      asiBonus: resolvedAsiBonus(),
      featName: asiMode === "feat" ? (featChoice || null) : null,
    });
    onDone();
  }

  const canNext = () => {
    if (step === 1) {
      if (asiMode === "feat") return !!featChoice;
      if (asiMode === "+1+1") return asiA !== asiB && final[asiA] < 20 && final[asiB] < 20;
      if (asiMode === "+2") return final[asiSingle] < 20;
      return true;
    }
    if (step === 2) return hpMethod === "average" || rolledHp !== null;
    return true;
  };

  const sign = (n: number) => (n >= 0 ? `+${n}` : String(n));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Level Up — Level {targetLevel}
            <Badge variant="secondary" className="text-xs">{character.class}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">

        <div className="text-xs text-muted-foreground mb-1">
          Step {stepIndex + 1} of {steps.length}
        </div>
        <Separator className="mb-4" />

        {/* ── Step 0 — Features Gained ──────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">New Features at Level {targetLevel}</h3>
            {loadingApi ? (
              <p className="text-sm text-muted-foreground italic">Loading features…</p>
            ) : features.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No new class features gained at this level.
              </p>
            ) : (
              <ul className="space-y-2">
                {features.map((f) => (
                  <FeatureItem key={f.index} name={f.name} detailMap={featDetailMap} />
                ))}
              </ul>
            )}

            {/* Spell slot progression — covers full, half, third (EK/AT) and pact casters */}
            <SpellSlotGrid
              slots={slotsForClass(character.class, targetLevel, character.subclass)}
              level={targetLevel}
              abilityLabel={(() => {
                const a = resolveSpellcastingAbility(character.class, character.spellcasting_ability);
                return a ? ABILITY_LABELS[a] : null;
              })()}
            />

            <p className="text-xs text-muted-foreground pt-1">
              Click any feature name to read its description.
            </p>
          </div>
        )}

        {/* ── Step 1 — ASI / Feat ───────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">{isEpicBoon ? "Epic Boon" : "Ability Score Improvement"}</h3>
            {isEpicBoon ? (
              <p className="text-sm text-muted-foreground">
                At level 19 you gain an Epic Boon feat.
              </p>
            ) : (
              <div className="flex gap-2">
                {(["+2", "+1+1", "feat"] as AsiMode[]).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={asiMode === m ? "default" : "outline"}
                    onClick={() => setAsiMode(m)}
                  >
                    {m === "+2" ? "+2 to one" : m === "+1+1" ? "+1 to two" : "Take a Feat"}
                  </Button>
                ))}
              </div>
            )}

            {asiMode === "+2" && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Choose ability to increase by 2 (max 20):</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ABILITIES.map((a) => {
                    const current = final[a];
                    const capped = current >= 20;
                    return (
                      <button
                        key={a}
                        type="button"
                        disabled={capped}
                        onClick={() => setAsiSingle(a)}
                        className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          asiSingle === a
                            ? "border-primary bg-primary/10 font-semibold"
                            : capped
                              ? "opacity-40 cursor-not-allowed border-transparent bg-muted/20"
                              : "border-transparent bg-muted/40 hover:border-primary/50"
                        }`}
                      >
                        <span>{ABILITY_LABELS[a]}</span>
                        <span className="text-muted-foreground text-xs">
                          {current} → {capped ? "cap" : Math.min(20, current + 2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {asiMode === "+1+1" && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">First ability (+1):</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ABILITIES.map((a) => {
                      const capped = final[a] >= 20;
                      return (
                        <button
                          key={a}
                          type="button"
                          disabled={capped || a === asiB}
                          onClick={() => setAsiA(a)}
                          className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            asiA === a
                              ? "border-primary bg-primary/10 font-semibold"
                              : capped || a === asiB
                                ? "opacity-40 cursor-not-allowed border-transparent bg-muted/20"
                                : "border-transparent bg-muted/40 hover:border-primary/50"
                          }`}
                        >
                          <span>{ABILITY_LABELS[a]}</span>
                          <span className="text-muted-foreground text-xs">{final[a]} → {final[a]+1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Second ability (+1):</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ABILITIES.map((a) => {
                      const capped = final[a] >= 20;
                      return (
                        <button
                          key={a}
                          type="button"
                          disabled={capped || a === asiA}
                          onClick={() => setAsiB(a)}
                          className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            asiB === a
                              ? "border-primary bg-primary/10 font-semibold"
                              : capped || a === asiA
                                ? "opacity-40 cursor-not-allowed border-transparent bg-muted/20"
                                : "border-transparent bg-muted/40 hover:border-primary/50"
                          }`}
                        >
                          <span>{ABILITY_LABELS[a]}</span>
                          <span className="text-muted-foreground text-xs">{final[a]} → {final[a]+1}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {asiMode === "feat" && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {isEpicBoon ? "Choose an Epic Boon:" : "Choose a feat:"}
                </p>
                {loadingApi ? (
                  <p className="text-sm italic text-muted-foreground">Loading feats…</p>
                ) : (
                  <FeatSelect featList={featList} value={featChoice} onChange={setFeatChoice} />
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2 — HP Increase ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Hit Point Increase</h3>
            <p className="text-sm text-muted-foreground">
              Your hit die is <strong>d{hitDie}</strong>. CON modifier: <strong>{sign(conMod)}</strong>.
            </p>
            <div className="flex gap-3">
              <div
                className={`flex-1 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                  hpMethod === "average" ? "border-primary bg-primary/5" : "border-transparent bg-muted/40"
                }`}
                onClick={() => setHpMethod("average")}
              >
                <p className="font-semibold text-sm">Take Average</p>
                <p className="text-2xl font-black text-primary mt-1">{sign(Math.max(1, avgHp))}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Math.floor(hitDie / 2) + 1}{sign(conMod)} (min 1)
                </p>
              </div>
              <div
                className={`flex-1 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                  hpMethod === "roll" ? "border-primary bg-primary/5" : "border-transparent bg-muted/40"
                }`}
                onClick={() => { setHpMethod("roll"); setRolledHp(null); }}
              >
                <p className="font-semibold text-sm">Roll d{hitDie}</p>
                {rolledHp !== null ? (
                  <p className="text-2xl font-black text-primary mt-1">{sign(rolledHp)}</p>
                ) : (
                  <p className="text-2xl font-black text-muted-foreground/40 mt-1">?</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs mt-1.5 w-full"
                  onClick={(e) => { e.stopPropagation(); rollHitDie(); }}
                >
                  Roll!
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Current HP max: {character.hp_max ?? "?"} → New: {(character.hp_max ?? 0) + resolvedHpGain()}
            </p>
          </div>
        )}

        {/* ── Step 3 — Confirm ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Summary</h3>
            <div className="rounded-md bg-muted/40 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level</span>
                <span className="font-semibold">{character.level} → {targetLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HP Max</span>
                <span className="font-semibold">
                  {character.hp_max ?? "?"} → {(character.hp_max ?? 0) + resolvedHpGain()}
                  <span className="text-muted-foreground text-xs ml-1">({sign(resolvedHpGain())})</span>
                </span>
              </div>
              {hasAsi && asiMode !== "feat" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ability Score</span>
                  <span className="font-semibold">
                    {Object.entries(resolvedAsiBonus()).map(([a, b]) =>
                      `${a.slice(0, 3).toUpperCase()} ${sign(b as number)}`
                    ).join(", ")}
                  </span>
                </div>
              )}
              {showImprovementStep && asiMode === "feat" && featChoice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isEpicBoon ? "Epic Boon" : "Feat"}</span>
                  <span className="font-semibold">{featChoice}</span>
                </div>
              )}
              {features.length > 0 && (
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Features</span>
                  <span className="font-semibold text-right max-w-[55%]">
                    {features.slice(0, 3).map((f) => f.name).join(", ")}
                    {features.length > 3 ? ` + ${features.length - 3} more` : ""}
                  </span>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        </div>

        <DialogFooter className="mt-4 gap-2">
          {stepIndex > 0 && (
            <Button variant="outline" onClick={() => setStepIndex((i) => i - 1)}>
              Back
            </Button>
          )}
          {stepIndex < steps.length - 1 ? (
            <Button disabled={!canNext()} onClick={() => setStepIndex((i) => i + 1)}>
              Next
            </Button>
          ) : (
            <Button disabled={loading || !canNext()} onClick={finish}>
              {loading ? "Applying…" : "Apply Level Up"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
