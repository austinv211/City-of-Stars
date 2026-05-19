import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { CampaignHeader } from "../components/CampaignHeader";
import { PartyStatsPanel } from "../components/PartyStatsPanel";
import { CharacterStatMeter } from "../components/CharacterStatMeter";
import { useSessionNotes } from "../hooks/useSessionNotes";
import { useCampaign } from "@/core/context/CampaignContext";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { supabase } from "@/lib/supabase";
import { ScrollText, Lock, TrendingUp } from "lucide-react";
import type { SessionNote } from "../types/campaign.types";

function SessionBlock({
  sessionNumber,
  sessionLabel,
  partyNote,
  dmNote,
  isDM,
  isCurrent,
}: {
  sessionNumber: number;
  sessionLabel: string;
  partyNote: SessionNote | undefined;
  dmNote: SessionNote | undefined;
  isDM: boolean;
  isCurrent: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">{sessionLabel} {sessionNumber}</h2>
        {isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
      </div>

      {/* Party Notes */}
      {partyNote?.content ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{partyNote.content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No party notes for this session.</p>
      )}

      {/* DM-only Notes */}
      {isDM && (
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Lock className="h-3 w-3" />
              DM Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            {dmNote?.content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{dmNote.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No DM notes for this session.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CampaignPage() {
  const { campaign, isDM, loading: campaignLoading } = useCampaign();
  const { notes } = useSessionNotes();
  const { characters } = useCharacters();
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [levelingUp, setLevelingUp] = useState(false);

  const activeCharacters = characters.filter((c) => c.status === "active");
  const currentLevel = activeCharacters[0]?.level ?? 1;

  async function handleLevelUp() {
    if (!campaign) return;
    setLevelingUp(true);
    await supabase.rpc("level_up_campaign", { campaign_id: campaign.id });
    setLevelingUp(false);
    setLevelUpOpen(false);
  }

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <p className="text-muted-foreground">You are not a member of any campaign yet.</p>
        <p className="text-xs text-muted-foreground">
          Ask your Dungeon Master to add you to the campaign.
        </p>
      </div>
    );
  }

  const currentSession = campaign.current_session;
  const sessionLabel = campaign.session_label ?? "Session";
  const prevSession = currentSession - 1;

  function getNote(session: number, visibility: "dm_only" | "party") {
    return notes.find((n) => n.session_number === session && n.visibility === visibility);
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <CampaignHeader campaign={campaign} isDM={isDM} memberCount={characters.length} />
        {isDM && (
          <Button variant="outline" onClick={() => setLevelUpOpen(true)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Level Up Party
          </Button>
        )}
      </div>

      <Separator />

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">Session Notes</TabsTrigger>
          <TabsTrigger value="party">Party Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6 space-y-8">
          {/* Current session */}
          <SessionBlock
            sessionNumber={currentSession}
            sessionLabel={sessionLabel}
            partyNote={getNote(currentSession, "party")}
            dmNote={getNote(currentSession, "dm_only")}
            isDM={isDM}
            isCurrent
          />

          {/* Previous session */}
          {prevSession >= 1 && (
            <>
              <Separator />
              <SessionBlock
                sessionNumber={prevSession}
                sessionLabel={sessionLabel}
                partyNote={getNote(prevSession, "party")}
                dmNote={getNote(prevSession, "dm_only")}
                isDM={isDM}
                isCurrent={false}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="party" className="mt-6 space-y-6">
          <PartyStatsPanel />
          {activeCharacters.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Per-Character Stats
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeCharacters.map((c) => (
                  <CharacterStatMeter key={c.id} character={c} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Level Up dialog */}
      <Dialog open={levelUpOpen} onOpenChange={setLevelUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Level Up Party</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Level up all active characters from{" "}
            <strong>Level {currentLevel}</strong> to{" "}
            <strong>Level {currentLevel + 1}</strong>?
          </p>
          <p className="text-xs text-muted-foreground">
            This will update all {activeCharacters.length} active character
            {activeCharacters.length !== 1 ? "s" : ""} simultaneously.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelUpOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLevelUp} disabled={levelingUp}>
              {levelingUp ? "Leveling up…" : `Level Up to ${currentLevel + 1}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
