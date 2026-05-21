import { useEffect, useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/core/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { Label } from "@/core/components/ui/label";
import { ChevronLeft, ChevronRight, BookOpen, UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  current_session: number;
}

interface MyMembership {
  id: string;
  campaign_id: string;
  role: "dm" | "player";
}

const ALL_ROLES: Array<"dm" | "player"> = ["dm", "player"];
const PAGE_SIZE = 10;

const ROLE_COLORS: Record<string, string> = {
  dm: "text-primary border-primary/30",
  player: "text-muted-foreground border-border",
};

export default function AdminCampaignsPage() {
  const { user } = useAuth();
  const { refreshCampaign } = useCampaign();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [myMemberships, setMyMemberships] = useState<MyMembership[]>([]);

  // Add role dialog
  const [joinTarget, setJoinTarget] = useState<Campaign | null>(null);
  const [joinRole, setJoinRole] = useState<"dm" | "player">("player");
  const [joinSaving, setJoinSaving] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Leave (remove single role) confirmation
  const [leaveTarget, setLeaveTarget] = useState<MyMembership | null>(null);
  const [leaveCampaignName, setLeaveCampaignName] = useState("");
  const [leaving, setLeaving] = useState(false);

  async function loadPage(p: number) {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const [{ data: campData, count }, { data: memberData }] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, name, description, created_at, current_session", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase
        .from("campaign_members")
        .select("id, campaign_id, role")
        .eq("user_id", user?.id ?? ""),
    ]);

    setCampaigns((campData as Campaign[]) ?? []);
    setTotal(count ?? 0);
    setMyMemberships((memberData as MyMembership[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadPage(page); }, [page, user?.id]);

  function myRoles(campaignId: string): MyMembership[] {
    return myMemberships.filter((m) => m.campaign_id === campaignId);
  }

  function missingRoles(campaignId: string): Array<"dm" | "player"> {
    const existing = myRoles(campaignId).map((m) => m.role);
    return ALL_ROLES.filter((r) => !existing.includes(r));
  }

  function openAddRole(campaign: Campaign) {
    const missing = missingRoles(campaign.id);
    setJoinTarget(campaign);
    setJoinRole(missing[0] ?? "player");
    setJoinError(null);
  }

  async function handleJoin() {
    if (!joinTarget || !user) return;
    setJoinSaving(true);
    setJoinError(null);

    const { error } = await supabase
      .from("campaign_members")
      .insert({ campaign_id: joinTarget.id, user_id: user.id, role: joinRole });

    if (error) {
      setJoinError(error.message);
      setJoinSaving(false);
      return;
    }

    setJoinTarget(null);
    setJoinSaving(false);
    await Promise.all([loadPage(page), refreshCampaign()]);
  }

  function openLeave(membership: MyMembership, campaignName: string) {
    setLeaveTarget(membership);
    setLeaveCampaignName(campaignName);
  }

  async function handleLeave() {
    if (!leaveTarget) return;
    setLeaving(true);
    await supabase.from("campaign_members").delete().eq("id", leaveTarget.id);
    setLeaveTarget(null);
    setLeaving(false);
    await Promise.all([loadPage(page), refreshCampaign()]);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          All Campaigns
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {total} {total === 1 ? "campaign" : "campaigns"} · Add yourself with one or more roles per campaign
        </p>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Your Roles</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-8 w-8 opacity-40" />
                    <p>No campaigns found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => {
                const roles = myRoles(c.id);
                const missing = missingRoles(c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium truncate max-w-xs">{c.name}</p>
                      {c.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                          {c.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.current_session}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {roles.map((mem) => (
                            <Badge
                              key={mem.id}
                              variant="outline"
                              className={`capitalize text-xs gap-1 pr-1 ${ROLE_COLORS[mem.role] ?? ""}`}
                            >
                              {mem.role === "dm" ? "DM" : "Player"}
                              <button
                                type="button"
                                onClick={() => openLeave(mem, c.name)}
                                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                                title={`Remove ${mem.role} role`}
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {missing.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => openAddRole(c)}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Add Role
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Role dialog */}
      <Dialog open={!!joinTarget} onOpenChange={(o) => { if (!o) setJoinTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Join <span className="font-medium text-foreground">{joinTarget?.name}</span> with an additional role.
          </p>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={joinRole} onValueChange={(v) => setJoinRole(v as "dm" | "player")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {joinTarget && missingRoles(joinTarget.id).map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "dm" ? "Dungeon Master" : "Player"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {joinError && <p className="text-sm text-destructive">{joinError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinTarget(null)}>Cancel</Button>
            <Button onClick={handleJoin} disabled={joinSaving}>
              {joinSaving ? "Adding…" : "Add Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove role confirmation */}
      <Dialog open={!!leaveTarget} onOpenChange={(o) => { if (!o) setLeaveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove role?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove your{" "}
            <span className="font-medium text-foreground capitalize">
              {leaveTarget?.role === "dm" ? "Dungeon Master" : "Player"}
            </span>{" "}
            role from <span className="font-medium text-foreground">{leaveCampaignName}</span>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={leaving} onClick={handleLeave}>
              {leaving ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
