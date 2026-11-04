import { useState } from "react";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge";
import { ResponsiveTable } from "@/core/components/ui/responsive-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { useAuth } from "@/core/context/AuthContext";
import { AddWhitelistDialog } from "../components/AddWhitelistDialog";
import {
  ALL_ROLES,
  ROLE_LABELS,
  addWhitelistRole,
  removeWhitelistRole,
  useWhitelist,
  type AppRole,
  type Signup,
  type WhitelistEntry,
} from "../hooks/useWhitelist";

const PAGE_SIZE = 10;

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "text-destructive border-destructive/30",
  dm: "text-primary border-primary/30",
  player: "text-muted-foreground border-border",
};

const plural = (n: number, word: string) => `${String(n)} ${word}${n === 1 ? "" : "s"}`;

function SignupStatus({ signup }: { signup: Signup | undefined }) {
  if (!signup) return <span className="text-muted-foreground">Not signed up yet</span>;
  return (
    <span>
      Signed up as <span className="font-medium">{signup.display_name ?? "(no name yet)"}</span>
    </span>
  );
}

function RoleBadges({ entries, onRemove }: { entries: WhitelistEntry[]; onRemove: (e: WhitelistEntry) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((entry) => (
        <Badge key={entry.id} variant="outline" className={`gap-1 pr-1 text-xs capitalize ${ROLE_COLORS[entry.app_role]}`}>
          {ROLE_LABELS[entry.app_role]}
          <button
            type="button"
            onClick={() => onRemove(entry)}
            className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
            aria-label={`Remove ${entry.app_role} role from ${entry.email}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

export default function AdminWhitelistPage() {
  const { user } = useAuth();
  const { loading, entries, grouped, signups, rolesFor, reload } = useWhitelist();
  const [page, setPage] = useState(0);
  /** null: closed; "": adding a new email; otherwise adding a role to that email. */
  const [adding, setAdding] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhitelistEntry | null>(null);

  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const pageRows = grouped.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const isLastRole = !!deleteTarget && rolesFor(deleteTarget.email).length === 1;

  async function handleAdd(email: string, role: AppRole) {
    if (rolesFor(email).includes(role)) return { error: `${email} already has the ${ROLE_LABELS[role]} role.` };
    const result = await addWhitelistRole(email, role, user?.id);
    if (!result.error) await reload();
    return result;
  }

  async function handleDelete(entry: WhitelistEntry) {
    setDeleteTarget(null);
    await removeWhitelistRole(entry.id);
    await reload();
  }

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-2xl font-bold text-transparent">
            Email Whitelist
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Only listed emails can sign up. {plural(grouped.length, "email")}, {plural(entries.length, "role")}.
          </p>
        </div>
        <Button onClick={() => setAdding("")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Email
        </Button>
      </div>

      <ResponsiveTable
        data={pageRows}
        loading={loading}
        skeletonRows={PAGE_SIZE}
        getRowKey={([email]) => email}
        empty={<div className="border border-border py-12 text-center text-muted-foreground">No entries yet.</div>}
        columns={[
          { key: "email", header: "Email", primary: true, cell: ([email]) => email },
          {
            key: "status",
            header: "Account",
            cellClassName: "text-xs",
            cell: ([email]) => <SignupStatus signup={signups.get(email.toLowerCase())} />,
          },
          { key: "roles", header: "Roles", cell: ([, list]) => <RoleBadges entries={list} onRemove={setDeleteTarget} /> },
          {
            key: "added",
            header: "Added",
            cellClassName: "text-xs text-muted-foreground",
            cell: ([, list]) => new Date(list[0].created_at).toLocaleDateString(),
          },
          {
            key: "actions",
            header: "",
            actions: true,
            headClassName: "w-28",
            cell: ([email]) =>
              rolesFor(email).length < ALL_ROLES.length && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAdding(email)}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Role
                </Button>
              ),
          },
        ]}
      />

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {adding !== null && (
        <AddWhitelistDialog
          existingEmail={adding || null}
          existingRoles={rolesFor(adding)}
          onClose={() => setAdding(null)}
          onAdd={handleAdd}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove role?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove the <span className="font-medium text-foreground">{deleteTarget && ROLE_LABELS[deleteTarget.app_role]}</span> role
            from <span className="font-medium text-foreground">{deleteTarget?.email}</span>?
            {isLastRole && <span className="mt-1 block">This is their only role — they will no longer be able to sign up.</span>}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && void handleDelete(deleteTarget)}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
