import { Dices, History, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { CharacterQuickRef } from "../CharacterQuickRef";
import { RollLog } from "../RollLog";
import { HistoryLog } from "./HistoryLog";
import type { EncounterScreen } from "../../hooks/useEncounterScreen";

const trigger = "flex h-9 w-full items-center gap-1 text-xs";
const content = "mt-0 flex-1 overflow-y-auto p-3";

/**
 * The roll log; for the DM, the encounter history with undo; and a character
 * tab -- the viewer's own sheet for a player, the selected combatant's for
 * the DM.
 */
export function SideRegion({ screen }: { screen: EncounterScreen }) {
  const { isDM, combat } = screen;
  const character = isDM ? screen.panelCharacter : screen.ownCharacterFull;
  const participant = isDM ? screen.panelParticipant : screen.ownParticipant;
  const showCharacter =
    !!character && !!participant && (!isDM || !!participant.character_id);

  if (!showCharacter && !isDM) {
    return (
      <div className="h-full min-h-0 overflow-y-auto p-3 pt-2">
        <RollLog entries={screen.history} />
      </div>
    );
  }

  return (
    <Tabs defaultValue="rolls" className="flex h-full flex-col">
      <TabsList className="mx-3 mt-2 h-11 shrink-0 text-xs">
        <TabsTrigger value="rolls" className={trigger}>
          <Dices className="h-3 w-3" />
          Rolls
        </TabsTrigger>
        {isDM && (
          <TabsTrigger value="history" className={trigger}>
            <History className="h-3 w-3" />
            History
          </TabsTrigger>
        )}
        {showCharacter && (
          <TabsTrigger value="character" className={trigger}>
            <User className="h-3 w-3" />
            <span className="truncate">{isDM ? character.name : "My Character"}</span>
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="rolls" className={content}>
        <RollLog entries={screen.history} />
      </TabsContent>
      {isDM && (
        <TabsContent value="history" className={content}>
          <HistoryLog
            events={screen.log.events}
            participants={screen.participants}
            onUndo={(patch, p) => void screen.log.undo(patch, p)}
          />
        </TabsContent>
      )}
      {showCharacter && (
        <TabsContent value="character" className={content}>
          <CharacterQuickRef
            character={character}
            participant={participant}
            onApplyDamage={(amount, type, opts) =>
              combat.applyDamage(participant.id, amount, type, opts)
            }
            onHeal={(amount) => combat.applyHealing(participant.id, amount)}
            onSetConcentration={(spell) =>
              combat.setConcentration(participant.id, spell)
            }
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
