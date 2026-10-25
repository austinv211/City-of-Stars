import { Dices, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { CharacterQuickRef } from "../CharacterQuickRef";
import { RollLog } from "../RollLog";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";

/**
 * The roll log, plus a character tab: the viewer's own sheet for a player,
 * the selected combatant's for the DM.
 */
export function SideRegion({ screen }: { screen: EncounterScreen }) {
  const { isDM, combat } = screen;
  const character = isDM ? screen.panelCharacter : screen.ownCharacterFull;
  const participant = isDM ? screen.panelParticipant : screen.ownParticipant;
  const showCharacter =
    !!character && !!participant && (!isDM || !!participant.character_id);

  if (!showCharacter) {
    return (
      <div className="h-full min-h-0 overflow-y-auto p-3 pt-2">
        <RollLog entries={screen.history} />
      </div>
    );
  }

  return (
    <Tabs defaultValue="rolls" className="flex h-full flex-col">
      <TabsList className="mx-3 mt-2 h-11 shrink-0 text-xs">
        <TabsTrigger
          value="rolls"
          className="flex h-9 w-full items-center gap-1 text-xs"
        >
          <Dices className="h-3 w-3" />
          Rolls
        </TabsTrigger>
        <TabsTrigger
          value="character"
          className="flex h-9 w-full items-center gap-1 text-xs"
        >
          <User className="h-3 w-3" />
          {isDM ? character.name : "My Character"}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="rolls" className="mt-0 flex-1 overflow-y-auto p-3">
        <RollLog entries={screen.history} />
      </TabsContent>
      <TabsContent value="character" className="mt-0 flex-1 overflow-y-auto p-3">
        <CharacterQuickRef
          character={character}
          participant={participant}
          onApplyDamage={(amount, type, opts) =>
            combat.applyDamage(participant.id, amount, type, opts)
          }
          onHeal={(amount) => combat.applyHealing(participant.id, amount)}
          onSetConcentration={(spell) => combat.setConcentration(participant.id, spell)}
        />
      </TabsContent>
    </Tabs>
  );
}
