import { useState, useEffect } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { UserPlus, Trash2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";

interface Member {
  user_id: string;
  email: string;
  role: string;
  joined_at: string;
}

export default function DmMembersPage() {
  const { campaign } = useCampaign();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"player" | "dm">("player");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  async function load() {
    if (!campaign) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_campaign_members_with_email", { cid: campaign.id });
    if (error) console.error("[DmMembersPage] load error:", error);
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [campaign?.id]);

  async function handleAdd() {
    if (!campaign || !addEmail.trim()) return;
    setAdding(true);
    setAddError(null);

    // Look up user id by email
    const { data: userId, error: lookupErr } = await supabase.rpc("find_user_id_by_email", { target_email: addEmail.trim() });
    if (lookupErr || !userId) {
      setAddError("No account found with that email address.");
      setAdding(false);
      return;
    }

    // Check not already a member
    if (members.some((m) => m.user_id === userId)) {
      setAddError("This user is already a member of the campaign.");
      setAdding(false);
      return;
    }

    const { error: insertErr } = await supabase.from("campaign_members").insert({
      campaign_id: campaign.id,
      user_id: userId,
      role: addRole,
    });

    if (insertErr) {
      setAddError(insertErr.message);
      setAdding(false);
      return;
    }

    setAddOpen(false);
    setAddEmail("");
    setAddRole("player");
    setAdding(false);
    load();
  }

  async function handleRemove(member: Member) {
    if (!campaign) return;
    setRemoving(true);
    await supabase
      .from("campaign_members")
      .delete()
      .eq("campaign_id", campaign.id)
      .eq("user_id", member.user_id);
    setRemoveTarget(null);
    setRemoving(false);
    load();
  }

  async function handleRoleChange(member: Member, newRole: "player" | "dm") {
    if (!campaign) return;
    await supabase
      .from("campaign_members")
      .update({ role: newRole })
      .eq("campaign_id", campaign.id)
      .eq("user_id", member.user_id);
    load();
  }

  if (!campaign) {
    return (
      <div className="px-4 sm:px-6 py-8 text-center text-muted-foreground">
        No active campaign selected.
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Campaign Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{campaign.name}</p>
        </div>
        <Button onClick={() => { setAddOpen(true); setAddError(null); }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No members yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border divide-y divide-border">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Joined {new Date(m.joined_at).toLocaleDateString()}
                </p>
              </div>
              <Select
                value={m.role}
                onValueChange={(v) => handleRoleChange(m, v as "player" | "dm")}
              >
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="dm">DM</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => setRemoveTarget(m)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                autoFocus
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="player@example.com"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as "player" | "dm")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="dm">Dungeon Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={adding || !addEmail.trim()}>
              {adding ? "Adding…" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{removeTarget?.email}</span> will lose
            access to this campaign and all its content.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={() => removeTarget && handleRemove(removeTarget)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
