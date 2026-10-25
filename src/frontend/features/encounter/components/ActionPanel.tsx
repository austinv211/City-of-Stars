import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { ScrollArea } from "@/core/components/ui/scroll-area";
import type {
  CharacterWithScores,
  CharacterAttack,
} from "@/features/characters/types/character.types";
import type { EncounterParticipant } from "../types/encounter.types";
import { DicePoolBuilder } from "./DicePoolBuilder";
import { AttackCardList } from "./stage/AttackCardList";
import { AbilityCheckRow, SaveRow, SkillRow } from "./stage/CheckRows";
import { CombatStatus } from "./stage/CombatStatus";
import { ConditionEffects } from "./stage/ConditionEffects";
import { EconomyBar } from "./stage/EconomyBar";
import { MonsterActionList, MonsterTraits } from "./stage/MonsterActionList";
import { NpcProfile } from "./stage/NpcProfile";
import { UnarmedStrike } from "./stage/UnarmedStrike";
import { combatantStats } from "./stage/combatantStats";
import type { CombatantView } from "./stage/combatantView";
import { useCombatRolls, type TurnFlag } from "./stage/useCombatRolls";

interface Props {
  participant: EncounterParticipant;
  character: CharacterWithScores | null;
  attacks: CharacterAttack[];
  campaignId: string;
  encounterId: string;
  isMyTurn: boolean;
  isDM: boolean;
  canControl: boolean;
  onSetConcentration: (spell: string | null) => void;
  onSetHeroicInspiration: (value: boolean) => void;
  onSetCover: (cover: string) => void;
  onSetTurnFlag: (flag: TurnFlag, value: boolean) => void;
}

/**
 * Everything one combatant can do on the encounter screen.
 *
 * A composition of the sections in ./stage. Until Phase 3 this was a single
 * 1,250-line component; the numbers now come from combatantStats() and the
 * rolling from useCombatRolls, so each section is presentational.
 */
export function ActionPanel({
  participant,
  character,
  attacks,
  campaignId,
  encounterId,
  isMyTurn,
  isDM,
  canControl,
  onSetConcentration,
  onSetHeroicInspiration,
  onSetCover,
  onSetTurnFlag,
}: Props) {
  const rolls = useCombatRolls({
    participant,
    campaignId,
    encounterId,
    isDM,
    onSetTurnFlag,
  });

  // Players see only portrait + description for NPCs.
  if (!isDM && !participant.is_player) return <NpcProfile participant={participant} />;

  const view: CombatantView = {
    participant,
    character,
    stats: combatantStats(participant, character),
    rolls,
    locked: !canControl,
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 pr-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {participant.name}
          </span>
          {isMyTurn && (
            <Badge className="animate-pulse border-success/50 bg-success/20 text-success">
              Your Turn
            </Badge>
          )}
          {!participant.is_player && (
            <Badge variant="secondary" className="text-xs">
              NPC
            </Badge>
          )}
        </div>

        {/* Monster flavour / description (DM reference). */}
        {!participant.is_player && participant.description && (
          <p className="text-xs italic leading-relaxed text-muted-foreground">
            {participant.description}
          </p>
        )}

        <CombatStatus
          participant={participant}
          locked={view.locked}
          onSetHeroicInspiration={onSetHeroicInspiration}
          onSetConcentration={onSetConcentration}
          onSetCover={onSetCover}
        />
        <ConditionEffects stats={view.stats} />

        {participant.is_player && (
          <>
            <EconomyBar
              participant={participant}
              characterClass={character?.class ?? ""}
              rolls={rolls}
              locked={view.locked}
              onSetTurnFlag={onSetTurnFlag}
            />
            <Separator />
          </>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Dice Pool</p>
          <DicePoolBuilder
            disabled={view.locked}
            onRoll={(args) => void rolls.rollPool(args)}
          />
        </div>
        <Separator />

        <MonsterTraits traits={participant.special_abilities ?? []} />
        <MonsterActionList view={view} />
        <AttackCardList view={view} attacks={attacks} />
        {participant.is_player && <UnarmedStrike view={view} />}
        <SaveRow view={view} />
        <Separator />
        <SkillRow view={view} />
        <AbilityCheckRow view={view} />
      </div>
    </ScrollArea>
  );
}
