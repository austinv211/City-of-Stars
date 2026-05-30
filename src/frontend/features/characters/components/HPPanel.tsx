import { useEffect, useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Separator } from "@/core/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { logAudit } from "../lib/auditLog";
import { useRest } from "../hooks/useRest";
import type { CharacterWithScores } from "../types/character.types";
import { abilityModifier } from "../types/character.types";
import { CLASSES } from "../data/dnd2024.constants";
import { Moon, Sun, Loader2 } from "lucide-react";

interface Props {
  character: CharacterWithScores;
  constitutionScore: number;
  isOwn: boolean;
  isDM?: boolean;
  canEdit?: boolean;
  onSlotsLongRest: () => Promise<void>;
  onSlotsShortRest?: () => Promise<void>;
  onRefresh: () => void;
}

function Pip({ filled, onClick }: { filled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-5 h-5 rounded-full border-2 transition-colors ${
        filled
          ? "bg-primary border-primary"
          : "bg-transparent border-muted-foreground/40 hover:border-primary"
      }`}
    />
  );
}

export function HPPanel({
  character, constitutionScore, isOwn, isDM,
  canEdit: canEditProp,
  onSlotsLongRest, onSlotsShortRest, onRefresh,
}: Props) {
  const { user } = useAuth();
  const canEdit = canEditProp !== undefined ? canEditProp : (isOwn || !!isDM);

  const [hpCurrent, setHpCurrent] = useState(character.hp_current ?? character.hp_max ?? 0);
  const [hpMax, setHpMax] = useState(character.hp_max ?? 0);
  const [hpTemp, setHpTemp] = useState(character.hp_temp ?? 0);
  const [hitDiceCurrent, setHitDiceCurrent] = useState(
    character.hit_dice_current ?? character.level
  );
  const [successes, setSuccesses] = useState(character.death_save_successes);
  const [failures, setFailures] = useState(character.death_save_failures);
  const [editingHp, setEditingHp] = useState(false);
  const [editingMax, setEditingMax] = useState(false);
  const [editingTemp, setEditingTemp] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingHp) setHpCurrent(character.hp_current ?? character.hp_max ?? 0);
  }, [character.hp_current, character.hp_max, editingHp]);

  useEffect(() => {
    if (!editingMax) setHpMax(character.hp_max ?? 0);
  }, [character.hp_max, editingMax]);

  useEffect(() => {
    if (!editingTemp) setHpTemp(character.hp_temp ?? 0);
  }, [character.hp_temp, editingTemp]);

  useEffect(() => {
    setHitDiceCurrent(character.hit_dice_current ?? character.level);
  }, [character.hit_dice_current, character.level]);

  useEffect(() => {
    setSuccesses(character.death_save_successes);
    setFailures(character.death_save_failures);
  }, [character.death_save_successes, character.death_save_failures]);

  // Short rest dialog
  const [showShortRest, setShowShortRest] = useState(false);
  const [diceToSpend, setDiceToSpend] = useState(1);
  const [shortRestHealed, setShortRestHealed] = useState<number | null>(null);

  const classData = CLASSES.find((c) => c.name === character.class);
  const hitDieSize = classData?.hitDie ?? 8;
  const conMod = abilityModifier(constitutionScore);

  const suggestedMaxHp =
    hitDieSize + conMod + (character.level - 1) * (Math.ceil(hitDieSize / 2) + conMod);

  const { longRest, shortRest, resting } = useRest(character, onSlotsLongRest, onSlotsShortRest);

  async function save(updates: Partial<{
    hp_current: number; hp_max: number; hp_temp: number;
    hit_dice_current: number; death_save_successes: number; death_save_failures: number;
  }>) {
    setSaving(true);
    await supabase.from("characters").update(updates).eq("id", character.id);
    if (user) {
      for (const [key, val] of Object.entries(updates)) {
        const oldVal = String((character as unknown as Record<string, unknown>)[key] ?? "");
        await logAudit(character.id, user.id, key, oldVal, String(val));
      }
    }
    // Encounter participants stay in sync via the sync_character_to_participants
    // DB trigger on characters (HP, AC, conditions).
    setSaving(false);
    onRefresh();
  }

  async function handleLongRest() {
    await longRest();
    const recovered = Math.max(1, Math.floor(character.level / 2));
    const newHitDice = Math.min(character.level, hitDiceCurrent + recovered);
    setHpCurrent(hpMax);
    setHitDiceCurrent(newHitDice);
    setSuccesses(0);
    setFailures(0);
    onRefresh();
  }

  async function handleShortRest() {
    const healed = await shortRest(diceToSpend);
    const toSpend = Math.min(diceToSpend, hitDiceCurrent);
    setHpCurrent(Math.min(hpMax, hpCurrent + healed));
    setHitDiceCurrent(Math.max(0, hitDiceCurrent - toSpend));
    setShortRestHealed(healed);
  }

  function openShortRest() {
    setDiceToSpend(Math.min(1, hitDiceCurrent));
    setShortRestHealed(null);
    setShowShortRest(true);
  }

  function toggleSuccess(idx: number) {
    if (!canEdit) return;
    const newVal = successes > idx ? idx : idx + 1;
    const clamped = Math.min(3, newVal);
    setSuccesses(clamped);
    save({ death_save_successes: clamped });
  }

  function toggleFailure(idx: number) {
    if (!canEdit) return;
    const newVal = failures > idx ? idx : idx + 1;
    const clamped = Math.min(3, newVal);
    setFailures(clamped);
    save({ death_save_failures: clamped });
  }

  function clearDeathSaves() {
    setSuccesses(0);
    setFailures(0);
    save({ death_save_successes: 0, death_save_failures: 0 });
  }

  function useHitDie() {
    if (!canEdit || hitDiceCurrent <= 0) return;
    const roll = Math.floor(Math.random() * hitDieSize) + 1;
    const healed = roll + conMod;
    const newHp = Math.min(hpMax, hpCurrent + Math.max(1, healed));
    const newDice = hitDiceCurrent - 1;
    setHpCurrent(newHp);
    setHitDiceCurrent(newDice);
    save({ hp_current: newHp, hit_dice_current: newDice });
  }

  function resetHitDice() {
    setHitDiceCurrent(character.level);
    save({ hit_dice_current: character.level });
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hit Points
            </CardTitle>
            {isOwn && (
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={resting || saving || hitDiceCurrent <= 0}
                  onClick={openShortRest}
                >
                  {resting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sun className="h-3 w-3 mr-1" />}
                  Short Rest
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={resting || saving}
                  onClick={handleLongRest}
                >
                  {resting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Moon className="h-3 w-3 mr-1" />}
                  Long Rest
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* HP block — label row then value row, fixed column widths keep them aligned */}
          <div className="space-y-1.5">
            {/* Label row */}
            <div className="flex items-center gap-3">
              <p className="w-16 text-center text-[10px] uppercase tracking-wide text-muted-foreground">Current</p>
              <span className="w-5" />
              <p className="w-16 text-center text-[10px] uppercase tracking-wide text-muted-foreground" title={canEdit ? `Suggested: ${suggestedMaxHp}` : undefined}>Max</p>
              <p className="border-l border-border/40 pl-3 ml-1 w-14 text-center text-[10px] uppercase tracking-wide text-muted-foreground">Temp</p>
            </div>

            {/* Value row */}
            <div className="flex items-end gap-3">
              {/* Current */}
              <div className="w-16 text-center">
                {editingHp && canEdit ? (
                  <Input
                    type="number"
                    className="w-16 text-center text-xl font-bold h-9"
                    value={hpCurrent}
                    autoFocus
                    onChange={(e) => setHpCurrent(parseInt(e.target.value) || 0)}
                    onBlur={() => { save({ hp_current: hpCurrent }); setEditingHp(false); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { save({ hp_current: hpCurrent }); setEditingHp(false); }
                      if (e.key === "Escape") { setHpCurrent(character.hp_current ?? 0); setEditingHp(false); }
                    }}
                  />
                ) : (
                  <p
                    className={`text-4xl font-black leading-none transition-colors ${canEdit ? "cursor-pointer hover:text-primary" : ""}`}
                    onClick={() => canEdit && setEditingHp(true)}
                    title={canEdit ? "Click to edit" : undefined}
                  >
                    {hpCurrent}
                  </p>
                )}
              </div>

              <span className="w-5 text-center text-2xl font-light text-muted-foreground leading-none">/</span>

              {/* Max */}
              <div className="w-16 text-center" title={canEdit ? `Suggested: ${suggestedMaxHp}` : undefined}>
                {editingMax && canEdit ? (
                  <Input
                    type="number"
                    className="w-16 text-center text-xl font-bold h-9"
                    value={hpMax}
                    autoFocus
                    onChange={(e) => setHpMax(parseInt(e.target.value) || 0)}
                    onBlur={() => { save({ hp_max: hpMax }); setEditingMax(false); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { save({ hp_max: hpMax }); setEditingMax(false); }
                      if (e.key === "Escape") { setHpMax(character.hp_max ?? 0); setEditingMax(false); }
                    }}
                  />
                ) : (
                  <p
                    className={`text-2xl font-bold leading-none ${canEdit ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
                    onClick={() => canEdit && setEditingMax(true)}
                  >
                    {hpMax}
                  </p>
                )}
              </div>

              {/* Temp */}
              <div className="border-l border-border/40 pl-3 ml-1 w-14 text-center">
                {editingTemp && canEdit ? (
                  <Input
                    type="number"
                    className="w-14 text-center text-base font-bold h-8"
                    value={hpTemp}
                    autoFocus
                    onChange={(e) => setHpTemp(parseInt(e.target.value) || 0)}
                    onBlur={() => { save({ hp_temp: hpTemp }); setEditingTemp(false); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { save({ hp_temp: hpTemp }); setEditingTemp(false); }
                      if (e.key === "Escape") { setHpTemp(character.hp_temp ?? 0); setEditingTemp(false); }
                    }}
                  />
                ) : (
                  <p
                    className={`text-xl font-bold leading-none text-primary ${canEdit ? "cursor-pointer hover:text-primary/70 transition-colors" : ""}`}
                    onClick={() => canEdit && setEditingTemp(true)}
                  >
                    {hpTemp > 0 ? `+${hpTemp}` : "—"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Hit Dice */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Hit Dice</p>
              <p className="text-sm font-semibold">
                {hitDiceCurrent}/{character.level}d{hitDieSize}
              </p>
            </div>
            <div className="flex gap-1.5">
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={hitDiceCurrent <= 0 || saving}
                  onClick={useHitDie}
                >
                  Use (1d{hitDieSize}{conMod >= 0 ? `+${conMod}` : conMod})
                </Button>
              )}
              {isDM && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  disabled={hitDiceCurrent >= character.level || saving}
                  onClick={resetHitDice}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Death Saves */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Death Saves</p>
              {canEdit && (successes > 0 || failures > 0) && (
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={clearDeathSaves}>
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs w-16 text-green-500 font-medium">Success</span>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <Pip key={i} filled={successes > i} onClick={() => toggleSuccess(i)} />
                  ))}
                </div>
                {successes >= 3 && <span className="text-xs text-green-500 font-semibold">Stable!</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs w-16 text-red-500 font-medium">Failure</span>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <Pip key={i} filled={failures > i} onClick={() => toggleFailure(i)} />
                  ))}
                </div>
                {failures >= 3 && <span className="text-xs text-red-500 font-semibold">Dead!</span>}
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Short Rest Dialog */}
      <Dialog open={showShortRest} onOpenChange={(o) => { if (!o) { setShowShortRest(false); if (shortRestHealed !== null) onRefresh(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sun className="h-4 w-4" /> Short Rest
            </DialogTitle>
          </DialogHeader>

          {shortRestHealed === null ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Spend hit dice to recover HP. You have <span className="font-semibold text-foreground">{hitDiceCurrent}</span> d{hitDieSize} remaining.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm">Dice to spend:</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    disabled={diceToSpend <= 0}
                    onClick={() => setDiceToSpend((n) => Math.max(0, n - 1))}
                  >−</Button>
                  <span className="w-6 text-center font-bold">{diceToSpend}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0"
                    disabled={diceToSpend >= hitDiceCurrent}
                    onClick={() => setDiceToSpend((n) => Math.min(hitDiceCurrent, n + 1))}
                  >+</Button>
                </div>
                <span className="text-xs text-muted-foreground">(each: 1d{hitDieSize}{conMod >= 0 ? `+${conMod}` : conMod}, min 1)</span>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center space-y-2">
              <p className="text-3xl font-black text-green-500">+{shortRestHealed} HP</p>
              <p className="text-sm text-muted-foreground">Healed from {diceToSpend} hit {diceToSpend === 1 ? "die" : "dice"}</p>
            </div>
          )}

          <DialogFooter>
            {shortRestHealed === null ? (
              <>
                <Button variant="ghost" onClick={() => setShowShortRest(false)}>Cancel</Button>
                <Button
                  disabled={diceToSpend <= 0 || resting}
                  onClick={handleShortRest}
                >
                  {resting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Rest
                </Button>
              </>
            ) : (
              <Button onClick={() => { setShowShortRest(false); onRefresh(); }}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
