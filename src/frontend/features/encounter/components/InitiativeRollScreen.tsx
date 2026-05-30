import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Swords, Check, Loader2 } from "lucide-react";
import { useDice } from "../context/DiceContext";
import { supabase } from "@/lib/supabase";
import { abilityModifier, finalAbilityScores, deriveStats } from "@/features/characters/types/character.types";
import { useCharacter } from "@/features/characters/hooks/useCharacter";
import { hasJackOfAllTrades, halfProficiencyBonus, exhaustionD20Penalty } from "@/features/characters/data/rules2024";
import type { EncounterParticipant } from "../types/encounter.types";
import { cn } from "@/lib/utils";

interface Props {
  encounterId: string;
  campaignId: string;
  participants: EncounterParticipant[];
  ownParticipant: EncounterParticipant;
}

export function InitiativeRollScreen({ encounterId, campaignId, participants, ownParticipant }: Props) {
  const { rollPool } = useDice();
  const [rolling, setRolling] = useState(false);
  const [surprised, setSurprised] = useState(false);
  const { character } = useCharacter(ownParticipant.character_id ?? undefined);

  // Initiative = DEX mod, plus Jack of All Trades (Bard 2+) and any exhaustion
  // penalty — sourced live from the character sheet when available.
  let initMod = abilityModifier(ownParticipant.dex_score ?? 10);
  if (character?.ability_scores) {
    const final = finalAbilityScores(
      character.ability_scores,
      character.ability_scores.background_bonus_primary,
      character.ability_scores.background_bonus_secondary,
    );
    const d = deriveStats(final, character.level);
    initMod = d.initiative;
    if (hasJackOfAllTrades(character.class, character.level)) initMod += halfProficiencyBonus(d.proficiencyBonus);
    initMod += exhaustionD20Penalty(character.exhaustion);
  }
  const modLabel = initMod >= 0 ? `+${initMod}` : String(initMod);

  // Only show player participants in the waiting room list
  const playerParticipants = participants.filter((p) => p.is_player);

  async function handleRollInitiative() {
    if (rolling) return;
    setRolling(true);
    try {
      const total = await rollPool({
        campaignId,
        encounterId,
        characterName: ownParticipant.name,
        rolledByDm: false,
        pool: [{ sides: 20, count: 1 }],
        modifier: initMod,
        advantage: false,
        disadvantage: surprised, // 2024: a surprised creature has disadvantage on Initiative
        rollType: "Initiative",
      });

      // Save score and mark as rolled
      await supabase
        .from("encounter_participants")
        .update({
          initiative_score: total,
          has_rolled_initiative: true,
        })
        .eq("id", ownParticipant.id);

      // Reorder everyone in this encounter
      await supabase.rpc("reorder_initiative", { p_encounter_id: encounterId });
    } finally {
      setRolling(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Swords className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Roll for Initiative</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          The encounter has started. Roll your initiative to join the turn order.
        </p>
      </div>

      {/* Waiting room — player list */}
      <div className="w-full max-w-sm space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Players ({playerParticipants.filter((p) => p.has_rolled_initiative).length}/{playerParticipants.length} rolled)
        </p>
        {playerParticipants.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
              p.has_rolled_initiative ? "bg-success/10" : "bg-muted/30",
            )}
          >
            <div
              className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                p.has_rolled_initiative ? "bg-success/20" : "bg-muted/60",
              )}
            >
              {p.has_rolled_initiative ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              )}
            </div>
            <span className={cn("flex-1 font-medium", !p.has_rolled_initiative && "text-muted-foreground")}>
              {p.name}
              {p.id === ownParticipant.id && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
              )}
            </span>
            {p.has_rolled_initiative && (
              <Badge variant="secondary" className="text-xs font-bold">
                {p.initiative_score}
              </Badge>
            )}
            {!p.has_rolled_initiative && (
              <span className="text-xs text-muted-foreground">rolling…</span>
            )}
          </div>
        ))}
      </div>

      {/* Roll button */}
      <div className="flex flex-col items-center gap-2">
        {!ownParticipant.has_rolled_initiative && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={surprised}
              onChange={(e) => setSurprised(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Surprised (roll with disadvantage)
          </label>
        )}
        <Button
          size="lg"
          onClick={handleRollInitiative}
          disabled={rolling || ownParticipant.has_rolled_initiative}
          className="gap-2 px-8"
        >
          {rolling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Swords className="h-4 w-4" />
          )}
          {ownParticipant.has_rolled_initiative
            ? "Rolled!"
            : rolling
              ? "Rolling…"
              : `Roll Initiative (d20 ${modLabel})`}
        </Button>
        <p className="text-xs text-muted-foreground">
          Initiative bonus: {modLabel}
        </p>
      </div>
    </div>
  );
}
