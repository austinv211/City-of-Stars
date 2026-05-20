import { useEffect, useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Badge } from "@/core/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { Plus, Trash2, BookOpen, Radio } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { RichTextEditor } from "@/core/components/RichTextEditor";

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
  const { campaign: activeCampaign, switchCampaign } = useCampaign();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    // Show all campaigns where the user has a DM role (created or added as co-DM)
    const { data } = await supabase
      .from("campaign_members")
      .select(
        "campaigns(id, name, description, created_at, current_session, created_by)",
      )
      .eq("user_id", user.id)
      .eq("role", "dm")
      .order("campaigns(created_at)", { ascending: false });
    const campaigns = (data ?? [])
      .map((row: any) => row.campaigns)
      .filter(Boolean) as Campaign[];
    setCampaigns(campaigns);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  async function handleCreate() {
    if (!user || !name.trim()) return;
    setSaving(true);
    setCreateError(null);
    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      setCreateError(error.message);
      return;
    }
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

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Campaigns you run as Dungeon Master
          </p>
        </div>
        <Button
          onClick={() => {
            setCreateOpen(true);
            setCreateError(null);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">
            No campaigns yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y divide-border">
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{c.name}</p>
                  {activeCampaign?.id === c.id && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Active
                    </Badge>
                  )}
                </div>
                {c.description && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {c.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Session {c.current_session} · Created{" "}
                  {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              {activeCampaign?.id !== c.id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => switchCampaign(c.id)}
                >
                  <Radio className="h-3 w-3 mr-1" />
                  Switch
                </Button>
              )}
              {c.created_by === user?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setDeleteTarget(c)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Campaign Name</Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. City of Stars"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
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
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !name.trim()}>
              {saving ? "Creating…" : "Create Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>{" "}
            and all its characters, encounters, and session notes will be
            permanently deleted. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
