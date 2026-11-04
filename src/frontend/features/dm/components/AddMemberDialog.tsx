import { useState } from "react";
import { Loader2, Search, UserPlus, MailPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/core/components/ui/responsive-dialog";
import { useAuth } from "@/core/context/AuthContext";
import { cn } from "@/lib/utils";
import { useCandidateSearch, type Candidate } from "../hooks/useCandidateSearch";
import { addMember, inviteEmail, whitelistAndInvite, type MemberRole } from "../hooks/useCampaignRoster";
import { candidateAction, candidateStatus, looksLikeEmail } from "../lib/candidates";

interface Props {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

/**
 * Find someone by name and add them in one tap. People on the whitelist who
 * haven't signed up yet can be invited, and join the moment they do.
 */
export function AddMemberDialog({ campaignId, open, onOpenChange, onChanged }: Props) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<MemberRole>("player");
  const [busy, setBusy] = useState<string | null>(null);
  const { results, searching, error, refresh } = useCandidateSearch(campaignId, query, open);

  async function run(key: string, action: () => Promise<{ error?: string }>, done: string) {
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(done);
    onChanged();
    refresh(); // so the row shows its new state
  }

  function handlePick(c: Candidate) {
    const action = candidateAction(c, role);
    if (action.kind === "add") {
      void run(c.email, () => addMember(campaignId, action.userId, role), `${c.display_name} added`);
    } else if (action.kind === "invite") {
      void run(c.email, () => inviteEmail(campaignId, c.email, role), `${c.display_name} will join when they sign up`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent widthClassName="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a member</DialogTitle>
          <DialogDescription>Search by name or email. Only people on the whitelist appear.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="pl-9"
            />
          </div>
          <RolePicker role={role} onChange={setRole} />
          <CandidateList
            results={results}
            role={role}
            busy={busy}
            searching={searching}
            onPick={handlePick}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <NotFoundHint
            query={query}
            visible={!searching && results.length === 0}
            onWhitelist={() => {
              const email = query.trim();
              void run(
                email,
                () => whitelistAndInvite(campaignId, email, role),
                `${email} can now sign up and will join this campaign`,
              );
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RolePicker({ role, onChange }: { role: MemberRole; onChange: (r: MemberRole) => void }) {
  return (
    <div role="radiogroup" aria-label="Add as" className="grid grid-cols-2 gap-0.5 bg-input p-0.5 text-sm">
      {(["player", "dm"] as const).map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={role === r}
          onClick={() => onChange(r)}
          className={cn(
            "py-1.5 font-medium transition-colors",
            role === r ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Add as {r === "dm" ? "DM" : "player"}
        </button>
      ))}
    </div>
  );
}

function CandidateList({
  results, role, busy, searching, onPick,
}: {
  results: Candidate[];
  role: MemberRole;
  busy: string | null;
  searching: boolean;
  onPick: (c: Candidate) => void;
}) {
  if (searching && results.length === 0) {
    return (
      <div className="flex justify-center py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-label="Searching" />
      </div>
    );
  }
  return (
    <ul className="max-h-80 divide-y divide-border overflow-y-auto border border-border">
      {results.map((c) => (
        <CandidateRow key={c.email} c={c} role={role} busy={busy === c.email} onPick={onPick} />
      ))}
    </ul>
  );
}

function CandidateRow({
  c, role, busy, onPick,
}: {
  c: Candidate;
  role: MemberRole;
  busy: boolean;
  onPick: (c: Candidate) => void;
}) {
  const action = candidateAction(c, role);
  const status = candidateStatus(c, role);
  const actionable = action.kind === "add" || action.kind === "invite";

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary/15 text-sm font-semibold uppercase text-primary"
      >
        {c.display_name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{c.display_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {c.email}
          {status && ` · ${status}`}
        </p>
      </div>
      {actionable && (
        <Button size="sm" variant={action.kind === "add" ? "default" : "outline"} disabled={busy} onClick={() => onPick(c)}>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : action.kind === "add" ? (
            <><UserPlus className="mr-1 h-3.5 w-3.5" />Add</>
          ) : (
            <><MailPlus className="mr-1 h-3.5 w-3.5" />Invite</>
          )}
        </Button>
      )}
    </li>
  );
}

/** When nobody matches: admins can whitelist and invite an email in one go. */
function NotFoundHint({ query, visible, onWhitelist }: { query: string; visible: boolean; onWhitelist: () => void }) {
  const { isAdmin } = useAuth();
  if (!visible) return null;
  const email = query.trim();
  if (isAdmin && looksLikeEmail(email)) {
    return (
      <Button variant="outline" className="w-full" onClick={onWhitelist}>
        <MailPlus className="mr-2 h-4 w-4" />
        Whitelist {email} and invite them
      </Button>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Nobody matches. New people need to be added to the email whitelist by an admin first.
    </p>
  );
}
