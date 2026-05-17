import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs";
import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { Separator } from "@/core/components/ui/separator";
import { CampaignHeader } from "../components/CampaignHeader";
import { SessionNotesEditor } from "../components/SessionNotesEditor";
import { CampaignDetailsEditor } from "../components/CampaignDetailsEditor";
import { PartyStatsPanel } from "../components/PartyStatsPanel";
import { CharacterStatMeter } from "../components/CharacterStatMeter";
import { useCampaignNotes } from "../hooks/useCampaignNotes";
import { useCampaign } from "@/core/context/CampaignContext";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { supabase } from "@/lib/supabase";
import { TrendingUp } from "lucide-react";

export default function CampaignPage() {
  const { campaign, isDM, loading: campaignLoading } = useCampaign();
  const { notes, saving, updateNotes } = useCampaignNotes();
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
        <p className="text-xs text-muted-foreground">Ask your Dungeon Master to add you to the campaign.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <CampaignHeader
          campaign={campaign}
          isDM={isDM}
          memberCount={characters.length}
        />
        {isDM && (
          <Button variant="outline" onClick={() => setLevelUpOpen(true)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Level Up Party
          </Button>
        )}
      </div>

      <Separator />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="party">Party Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <SessionNotesEditor
            value={notes?.session_notes ?? null}
            isDM={isDM}
            saving={saving}
            onSave={(text) => updateNotes({ session_notes: text })}
          />
          <CampaignDetailsEditor
            value={notes?.campaign_details ?? null}
            isDM={isDM}
            saving={saving}
            onSave={(text) => updateNotes({ campaign_details: text })}
          />
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
