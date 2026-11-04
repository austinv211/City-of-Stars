import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { UserPlus, Trash2, Users, AlertTriangle, User, Mail, X } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";
import { ResponsiveTable } from "@/core/components/ui/responsive-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogFooter as DialogFooter,
} from "@/core/components/ui/responsive-dialog";
import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { useCharacters } from "@/features/characters/hooks/useCharacters";
import NoCampaignMessage from "@/features/dm/components/NoCampaignMessage";
import { AddMemberDialog } from "../components/AddMemberDialog";
import {
  cancelInvite,
  changeMemberRole,
  removeMember,
  useCampaignRoster,
  type MemberRole,
  type PendingInvite,
  type RosterMember,
} from "../hooks/useCampaignRoster";

/** Why a role change or removal would leave the campaign without a DM, if it would. */
function soleDmGuard(members: RosterMember[], target: RosterMember, selfId: string | undefined) {
  const dmCount = members.filter((m) => m.role === "dm").length;
  const isSoleDm = target.role === "dm" && dmCount === 1;
  return isSoleDm && target.user_id === selfId
    ? "You are the only DM. Appoint another DM first."
    : null;
}

export default function DmMembersPage() {
  const navigate = useNavigate();
  const { campaign } = useCampaign();
  const { user } = useAuth();
  const { characters } = useCharacters();
  const { members, invites, loading, reload } = useCampaignRoster(campaign?.id);

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<RosterMember | null>(null);
  const [guardError, setGuardError] = useState<string | null>(null);

  if (!campaign) return <NoCampaignMessage />;

  const activeCharacterByOwner = new Map(
    characters.filter((c) => c.status === "active").map((c) => [c.owner_id, c.id]),
  );

  async function apply(result: Promise<{ error?: string }>) {
    const { error } = await result;
    if (error) toast.error(error);
    await reload();
  }

  function tryRemove(member: RosterMember) {
    const blocked = soleDmGuard(members, member, user?.id);
    setGuardError(blocked);
    if (!blocked) setRemoveTarget(member);
  }

  function handleRoleChange(member: RosterMember, role: MemberRole) {
    const blocked = role === "player" ? soleDmGuard(members, member, user?.id) : null;
    const duplicate = members.some((m) => m.id !== member.id && m.user_id === member.user_id && m.role === role);
    setGuardError(blocked ?? (duplicate ? `${member.display_name} already has the ${role} role.` : null));
    if (!blocked && !duplicate) void apply(changeMemberRole(member.id, role));
  }

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-2xl font-bold text-transparent">
            Campaign Members
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{campaign.name}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {guardError && (
        <div role="alert" className="flex items-start gap-2 border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{guardError}</span>
        </div>
      )}

      {loading ? (
        <MembersSkeleton />
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Users className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No members yet.</p>
        </div>
      ) : (
        <ResponsiveTable
          data={members}
          getRowKey={(m) => m.id}
          columns={[
            {
              key: "name",
              header: "Member",
              primary: true,
              cell: (m) => (
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.display_name}</p>
                  {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                </div>
              ),
            },
            {
              key: "joined",
              header: "Joined",
              cellClassName: "text-xs text-muted-foreground",
              cell: (m) => new Date(m.joined_at).toLocaleDateString(),
            },
            {
              key: "role",
              header: "Role",
              cell: (m) => (
                <Select value={m.role} onValueChange={(v) => handleRoleChange(m, v as MemberRole)}>
                  <SelectTrigger className="h-7 w-24 text-xs" aria-label={`Role for ${m.display_name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="dm">DM</SelectItem>
                  </SelectContent>
                </Select>
              ),
            },
            {
              key: "character",
              header: "Character",
              cell: (m) => {
                const charId = activeCharacterByOwner.get(m.user_id);
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={!charId}
                    onClick={() => charId && navigate(`/dm/characters/${charId}`)}
                  >
                    <User className="mr-1 h-3 w-3" />
                    {charId ? "View" : "None"}
                  </Button>
                );
              },
            },
            {
              key: "actions",
              header: "",
              actions: true,
              headClassName: "w-10",
              cell: (m) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => tryRemove(m)}
                  aria-label={`Remove ${m.display_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ),
            },
          ]}
        />
      )}

      <PendingInvites invites={invites} onCancel={(i) => void apply(cancelInvite(i.id))} />

      <AddMemberDialog campaignId={campaign.id} open={addOpen} onOpenChange={setAddOpen} onChanged={() => void reload()} />

      <Dialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent widthClassName="md:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{removeTarget?.display_name}</span> will lose
            access to this campaign and all its content.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (removeTarget) void apply(removeMember(removeTarget.id));
                setRemoveTarget(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingInvites({ invites, onCancel }: { invites: PendingInvite[]; onCancel: (i: PendingInvite) => void }) {
  if (invites.length === 0) return null;
  return (
    <section aria-labelledby="pending-invites" className="space-y-2">
      <h2 id="pending-invites" className="text-xs font-semibold uppercase tracking-wide text-primary">
        Waiting to sign up
      </h2>
      <ul className="divide-y divide-border border border-border">
        {invites.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-4 py-2 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{i.email}</span>
            <span className="text-xs text-muted-foreground">{i.role === "dm" ? "DM" : "Player"}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onCancel(i)}
              aria-label={`Cancel invite for ${i.email}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">They join this campaign automatically when they create their account.</p>
    </section>
  );
}

function MembersSkeleton() {
  return (
    <div className="border border-border">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}
