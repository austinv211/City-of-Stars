import { Skeleton } from "@/core/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { CampaignHeader } from "../components/CampaignHeader";
import { PartyStatsPanel } from "../components/PartyStatsPanel";
import { CharacterStatMeter } from "../components/CharacterStatMeter";
import { useSessionNotes } from "../hooks/useSessionNotes";
import { useCampaign } from "@/core/context/CampaignContext";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import {
  ScrollText,
  Swords,
  BookOpen,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionNote } from "../types/campaign.types";

function SessionBlock({
  sessionNumber,
  sessionLabel,
  partyNote,
  isCurrent,
}: {
  sessionNumber: number;
  sessionLabel: string;
  partyNote: SessionNote | undefined;
  isCurrent: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">
          {sessionLabel} {sessionNumber}
        </h2>
        {isCurrent && (
          <Badge variant="default" className="text-xs">
            Current
          </Badge>
        )}
      </div>

      {partyNote?.content ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {partyNote.content}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No party notes for this session.
        </p>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const {
    campaign,
    campaigns,
    memberships,
    campaignEncounters,
    loading: campaignLoading,
    switchCampaign,
  } = useCampaign();
  const { notes } = useSessionNotes();
  const { characters } = useCharacters();

  const activeCharacters = characters.filter((c) => c.status === "active");

  if (campaignLoading) {
    return (
      <div className="px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const currentSession = campaign?.current_session ?? 1;
  const sessionLabel = campaign?.session_label ?? "Session";
  const prevSession = currentSession - 1;

  function getPartyNote(session: number) {
    return notes.find((n) => n.session_number === session && n.visibility === "party");
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      {/* Campaign index */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Campaigns you are a member of
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">
            You are not a member of any campaign yet.
          </p>
          <p className="text-xs text-muted-foreground">
            Ask your Dungeon Master to add you to the campaign.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {campaigns.map((c) => {
              const mem = memberships.find((m) => m.campaign_id === c.id);
              const hasEncounter = !!campaignEncounters[c.id];
              const isActive = campaign?.id === c.id;

              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/10"
                      : "bg-card hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sessionLabel} {c.current_session}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasEncounter && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-success">
                          <Swords className="h-3 w-3" />
                          <span>Encounter</span>
                        </div>
                      )}
                      <Badge
                        variant={mem?.role === "dm" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {mem?.role === "dm" ? "DM" : "Player"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {isActive ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => switchCampaign(c.id)}
                      >
                        <Radio className="h-3 w-3 mr-1" />
                        Switch
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {campaign && (
            <>
              <Separator />

              <div className="flex items-start justify-between gap-4 flex-wrap">
                <CampaignHeader
                  campaign={campaign}
                  isDM={false}
                  memberCount={characters.length}
                />
              </div>

              <Tabs defaultValue="sessions">
                <TabsList>
                  <TabsTrigger value="sessions">Session Notes</TabsTrigger>
                  <TabsTrigger value="party">Party Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="sessions" className="mt-6 space-y-8">
                  <SessionBlock
                    sessionNumber={currentSession}
                    sessionLabel={sessionLabel}
                    partyNote={getPartyNote(currentSession)}
                    isCurrent
                  />
                  {prevSession >= 1 && (
                    <>
                      <Separator />
                      <SessionBlock
                        sessionNumber={prevSession}
                        sessionLabel={sessionLabel}
                        partyNote={getPartyNote(prevSession)}
                        isCurrent={false}
                      />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="party" className="mt-6 space-y-6">
                  <PartyStatsPanel />
                  {activeCharacters.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">
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

            </>
          )}
        </>
      )}
    </div>
  );
}
