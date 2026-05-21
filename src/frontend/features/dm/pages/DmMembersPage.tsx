import { useState, useEffect } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Skeleton } from "@/core/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import { UserPlus, Trash2, Users, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import NoCampaignMessage from "@/features/dm/components/NoCampaignMessage";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: string;
  joined_at: string;
}

export default function DmMembersPage() {
  const { campaign } = useCampaign();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"player" | "dm">("player");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);
  const [dmGuardError, setDmGuardError] = useState<string | null>(null);

  async function load() {
    if (!campaign) return;
    setLoading(true);
    const { data, error } = await supabase.rpc(
      "get_campaign_members_with_email",
      { cid: campaign.id },
    );
    if (error) console.error("[DmMembersPage] load error:", error);
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [campaign?.id]);

  async function handleAdd() {
    if (!campaign || !addEmail.trim()) return;
    setAdding(true);
    setAddError(null);

    // Whitelist check first
    const { data: allowed } = await supabase.rpc("is_email_allowed", {
      user_email: addEmail.trim(),
    });
    if (!allowed) {
      setAddError("That email is not on the whitelist. Add it in the Admin panel first.");
      setAdding(false);
      return;
    }

    // Look up user id by email
    const { data: userId, error: lookupErr } = await supabase.rpc(
      "find_user_id_by_email",
      { target_email: addEmail.trim() },
    );
    if (lookupErr || !userId) {
      setAddError("No account found with that email. They must sign up first.");
      setAdding(false);
      return;
    }

    // Check not already a member WITH THIS SPECIFIC ROLE (multiple roles per user are allowed)
    if (members.some((m) => m.user_id === userId && m.role === addRole)) {
      setAddError(`This user already has the ${addRole} role in this campaign.`);
      setAdding(false);
      return;
    }

    const { error: insertErr } = await supabase
      .from("campaign_members")
      .insert({
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

  function dmCount() {
    return members.filter((m) => m.role === "dm").length;
  }

  function isSoleDM(member: Member) {
    return member.role === "dm" && dmCount() === 1;
  }

  function tryRemove(member: Member) {
    setDmGuardError(null);
    if (member.user_id === user?.id && isSoleDM(member)) {
      setDmGuardError("You are the only DM. Appoint another DM before leaving the campaign.");
      return;
    }
    setRemoveTarget(member);
  }

  async function handleRemove(member: Member) {
    if (!campaign) return;
    setRemoving(true);
    // Delete by id to target only this specific role row
    await supabase
      .from("campaign_members")
      .delete()
      .eq("id", member.id);
    setRemoveTarget(null);
    setRemoving(false);
    load();
  }

  async function handleRoleChange(member: Member, newRole: "player" | "dm") {
    if (!campaign) return;
    setDmGuardError(null);
    if (member.user_id === user?.id && member.role === "dm" && newRole === "player" && isSoleDM(member)) {
      setDmGuardError("You are the only DM. Appoint another DM before changing your role.");
      return;
    }
    // Block if changing to a role this user already has (would create a duplicate row)
    if (members.some((m) => m.id !== member.id && m.user_id === member.user_id && m.role === newRole)) {
      setDmGuardError(`This user already has the ${newRole} role. Add a separate row instead.`);
      return;
    }
    // Update by id to target only this specific role row
    await supabase
      .from("campaign_members")
      .update({ role: newRole })
      .eq("id", member.id);
    load();
  }

  if (!campaign) {
    return <NoCampaignMessage />;
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Campaign Members</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {campaign.name}
          </p>
        </div>
        <Button
          onClick={() => {
            setAddOpen(true);
            setAddError(null);
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {dmGuardError && (
        <div className="flex items-start gap-2 px-4 py-3 text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{dmGuardError}</span>
        </div>
      )}

      {loading ? (
        <div className="border border-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No members yet.</p>
        </div>
      ) : (
        <div className="border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.user_id}>
                  <TableCell className="font-medium">{m.email}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => tryRemove(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add member dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o) setAddOpen(false);
        }}
      >
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={addRole}
                onValueChange={(v) => setAddRole(v as "player" | "dm")}
              >
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
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={adding || !addEmail.trim()}>
              {adding ? "Adding…" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {removeTarget?.email}
            </span>{" "}
            will lose access to this campaign and all its content.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
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
