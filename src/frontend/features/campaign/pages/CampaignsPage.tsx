import { Skeleton } from "@/core/components/ui/skeleton";
import { NextSessionBanner } from "@/core/components/schedule/NextSessionBanner";
import { useScheduledSessions } from "@/core/hooks/useScheduledSessions";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { Separator } from "@/core/components/ui/separator";
import { CampaignHeader } from "../components/CampaignHeader";
import { CampaignSessionTabs } from "../components/CampaignSessionTabs";
import { useSessionNotes } from "../hooks/useSessionNotes";
import { useCampaign } from "@/core/context/CampaignContext";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import {
  Swords,
  BookOpen,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";


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
  const { next: nextSession } = useScheduledSessions(campaign?.id);
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

              <NextSessionBanner session={nextSession} />

              <div className="flex items-start justify-between gap-4 flex-wrap">
                <CampaignHeader
                  campaign={campaign}
                  isDM={false}
                  memberCount={characters.length}
                />
              </div>

              <CampaignSessionTabs
                currentSession={currentSession}
                sessionLabel={sessionLabel}
                notes={notes}
                activeCharacters={activeCharacters}
              />

            </>
          )}
        </>
      )}
    </div>
  );
}
