import { Lock, ScrollText } from "lucide-react";
import { RichText } from "@/core/components/RichText";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Separator } from "@/core/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import type { Character } from "@/features/characters/types/character.types";
import type { SessionNote, SessionNoteVisibility } from "../types/campaign.types";
import { CharacterStatMeter } from "./CharacterStatMeter";
import { PartyStatsPanel } from "./PartyStatsPanel";

interface Props {
  currentSession: number;
  sessionLabel: string;
  notes: SessionNote[];
  activeCharacters: Character[];
  /** The DM sees each session's private notes under the party's. */
  showDmNotes?: boolean;
}

/**
 * The campaign's "Session Notes" and "Party Stats" tabs: the current and
 * previous session's notes, then the party's stats. Shared by the player and
 * DM campaign pages.
 */
export function CampaignSessionTabs({
  currentSession,
  sessionLabel,
  notes,
  activeCharacters,
  showDmNotes = false,
}: Props) {
  const sessions = currentSession > 1 ? [currentSession, currentSession - 1] : [currentSession];
  const noteFor = (session: number, visibility: SessionNoteVisibility) =>
    notes.find((n) => n.session_number === session && n.visibility === visibility);

  return (
    <Tabs defaultValue="sessions">
      <TabsList>
        <TabsTrigger value="sessions">Session Notes</TabsTrigger>
        <TabsTrigger value="party">Party Stats</TabsTrigger>
      </TabsList>

      <TabsContent value="sessions" className="mt-6 space-y-8">
        {sessions.map((session, i) => (
          <div key={session} className="space-y-8">
            {i > 0 && <Separator />}
            <SessionBlock
              title={`${sessionLabel} ${session}`}
              isCurrent={session === currentSession}
              partyNote={noteFor(session, "party")}
              dmNote={showDmNotes ? noteFor(session, "dm_only") : undefined}
              showDmNotes={showDmNotes}
            />
          </div>
        ))}
      </TabsContent>

      <TabsContent value="party" className="mt-6 space-y-6">
        <PartyStatsPanel />
        {activeCharacters.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">
              Per-Character Stats
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeCharacters.map((c) => (
                <CharacterStatMeter key={c.id} character={c} />
              ))}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function SessionBlock({
  title,
  isCurrent,
  partyNote,
  dmNote,
  showDmNotes,
}: {
  title: string;
  isCurrent: boolean;
  partyNote: SessionNote | undefined;
  dmNote: SessionNote | undefined;
  showDmNotes: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">{title}</h2>
        {isCurrent && (
          <Badge variant="default" className="text-xs">
            Current
          </Badge>
        )}
      </div>
      <NoteOrEmpty note={partyNote} empty="No party notes for this session." />
      {showDmNotes && (
        <Card className="border border-primary/20 bg-primary/5">
          <CardHeader className="px-4 pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Lock className="h-3 w-3" />
              DM Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <NoteOrEmpty note={dmNote} empty="No DM notes for this session." />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NoteOrEmpty({ note, empty }: { note: SessionNote | undefined; empty: string }) {
  return note?.content ? (
    <RichText>{note.content}</RichText>
  ) : (
    <p className="text-sm italic text-muted-foreground">{empty}</p>
  );
}
