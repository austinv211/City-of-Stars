import { useEffect, useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Badge } from "@/core/components/ui/badge";
import { Skeleton } from "@/core/components/ui/skeleton";
import { Separator } from "@/core/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import {
  Plus, Trash2, BookOpen, Radio,
  TrendingUp, Swords,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { useSessionNotes } from "@/features/campaign/hooks/useSessionNotes";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import { CampaignHeader } from "@/features/campaign/components/CampaignHeader";
import { CampaignSessionTabs } from "@/features/campaign/components/CampaignSessionTabs";
import { RichTextEditor } from "@/core/components/RichTextEditor";
import { RichText } from "@/core/components/RichText";
import { NextSessionBanner } from "@/core/components/schedule/NextSessionBanner";
import { useScheduledSessions } from "@/core/hooks/useScheduledSessions";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  current_session: number;
  created_by: string;
}


export default function DmCampaignsPage() {
  const { user } = useAuth();
  const { campaign: activeCampaign, campaignEncounters, isDM, switchCampaign } = useCampaign();
  const { notes } = useSessionNotes();
  const { characters } = useCharacters();
  const { next: nextSession } = useScheduledSessions(activeCampaign?.id);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [levelingUp, setLevelingUp] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("campaign_members")
      .select("campaigns(id, name, description, created_at, current_session, created_by)")
      .eq("user_id", user.id)
      .eq("role", "dm")
      .order("campaigns(created_at)", { ascending: false });
    setCampaigns(
      (data ?? []).map((row: any) => row.campaigns).filter(Boolean) as Campaign[],
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function handleCreate() {
    if (!user || !name.trim()) return;
    setSaving(true);
    setCreateError(null);
    const { data, error } = await supabase
      .from("campaigns")
      .insert({ name: name.trim(), description: description.trim() || null, created_by: user.id })
      .select("id")
      .single();
    setSaving(false);
    if (error) { setCreateError(error.message); return; }
    setCreateOpen(false);
    setName("");
    setDescription("");
    load();
    if (data?.id) await switchCampaign(data.id);
  }

  async function handleDelete(campaign: Campaign) {
    await supabase.from("campaigns").delete().eq("id", campaign.id);
    setDeleteTarget(null);
    load();
  }

  async function handleLevelUp() {
    if (!activeCampaign) return;
    setLevelingUp(true);
    await supabase.rpc("level_up_campaign", { campaign_id: activeCampaign.id });
    setLevelingUp(false);
    setLevelUpOpen(false);
  }

  const activeCharacters = characters.filter((c) => c.status === "active");
  const currentLevel = activeCharacters[0]?.level ?? 1;
  const currentSession = activeCampaign?.current_session ?? 1;
  const sessionLabel = activeCampaign?.session_label ?? "Session";

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Campaigns
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Campaigns you run as Dungeon Master
          </p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setCreateError(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Campaign grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No campaigns yet. Create one to get started.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {campaigns.map((c) => {
              const isActive = activeCampaign?.id === c.id;
              const hasEncounter = !!campaignEncounters[c.id];
              return (
                <div
                  key={c.id}
                  className={cn(
                    "rounded-lg border p-4 transition-colors",
                    isActive ? "border-primary/40 bg-primary/10" : "bg-card hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Session {c.current_session}
                      </p>
                      {c.description && (
                        <RichText size="xs" clamp={1} className="mt-0.5 text-muted-foreground">{c.description}</RichText>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasEncounter && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-success">
                          <Swords className="h-3 w-3" />
                          <span>Encounter</span>
                        </div>
                      )}
                      {c.created_by === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(c)}
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    {isActive ? (
                      <Badge variant="secondary" className="text-[10px]">Active</Badge>
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

          {/* Campaign detail — only when active campaign is one of their DM campaigns */}
          {activeCampaign && isDM && (
            <>
              <Separator />

              <NextSessionBanner session={nextSession} />

              <div className="flex items-start justify-between gap-4 flex-wrap">
                <CampaignHeader
                  campaign={activeCampaign}
                  isDM
                  memberCount={characters.length}
                  onEditDescription={async (desc) => {
                    await supabase
                      .from("campaigns")
                      .update({ description: desc.trim() || null })
                      .eq("id", activeCampaign.id);
                  }}
                  onChangeIcon={async (icon) => {
                    await supabase.from("campaigns").update({ icon }).eq("id", activeCampaign.id);
                  }}
                />
                <Button variant="outline" onClick={() => setLevelUpOpen(true)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Level Up Party
                </Button>
              </div>

              <CampaignSessionTabs
                currentSession={currentSession}
                sessionLabel={sessionLabel}
                notes={notes}
                activeCharacters={activeCharacters}
                showDmNotes
              />
            </>
          )}
        </>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <div className="space-y-1.5">
              <Label>Campaign Name</Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. City of Stars"
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="A brief description of the campaign…"
                minHeight="5rem"
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? "Creating…" : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{deleteTarget?.name}</span>{" "}
            and all its characters, encounters, and session notes will be permanently deleted.
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setLevelUpOpen(false)}>Cancel</Button>
            <Button onClick={handleLevelUp} disabled={levelingUp}>
              {levelingUp ? "Leveling up…" : `Level Up to ${currentLevel + 1}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
