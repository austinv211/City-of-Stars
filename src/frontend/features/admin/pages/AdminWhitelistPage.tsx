import { useEffect, useState, useMemo } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";

interface WhitelistEntry {
  id: string;
  email: string;
  app_role: "admin" | "dm" | "player";
  created_at: string;
}

type AppRole = "admin" | "dm" | "player";
const ALL_ROLES: AppRole[] = ["admin", "dm", "player"];
const PAGE_SIZE = 10;

const ROLE_COLORS: Record<string, string> = {
  admin: "text-destructive border-destructive/30",
  dm: "text-primary border-primary/30",
  player: "text-muted-foreground border-border",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  dm: "DM",
  player: "Player",
};

export default function AdminWhitelistPage() {
  const { user } = useAuth();
  // Load all entries; group by email client-side so multiple roles show on one row
  const [allEntries, setAllEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  // Add dialog — can be pre-filled with an email when adding a role to existing entry
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("player");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Remove confirmation
  const [deleteTarget, setDeleteTarget] = useState<WhitelistEntry | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("allowed_emails")
      .select("*")
      .order("email", { ascending: true })
      .order("created_at", { ascending: true });
    setAllEntries((data as WhitelistEntry[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Group entries by email → one row per unique email with an array of role entries
  const grouped = useMemo(() => {
    const map = new Map<string, WhitelistEntry[]>();
    for (const entry of allEntries) {
      const list = map.get(entry.email) ?? [];
      list.push(entry);
      map.set(entry.email, list);
    }
    return Array.from(map.entries()); // [email, entries[]][]
  }, [allEntries]);

  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  const pageRows = grouped.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function rolesForEmail(email: string): AppRole[] {
    return allEntries.filter((e) => e.email === email).map((e) => e.app_role);
  }

  function missingRoles(email: string): AppRole[] {
    const existing = rolesForEmail(email);
    return ALL_ROLES.filter((r) => !existing.includes(r));
  }

  function openAddForEmail(email: string) {
    const missing = missingRoles(email);
    setNewEmail(email);
    setNewRole(missing[0] ?? "player");
    setAddError(null);
    setAddOpen(true);
  }

  function openAddNew() {
    setNewEmail("");
    setNewRole("player");
    setAddError(null);
    setAddOpen(true);
  }

  async function handleAdd() {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setSaving(true);
    setAddError(null);

    // Pre-check: block exact (email, role) duplicates before hitting DB
    if (allEntries.some((e) => e.email === email && e.app_role === newRole)) {
      setAddError(`${email} already has the ${ROLE_LABELS[newRole]} role.`);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("allowed_emails").insert({
      email,
      app_role: newRole,
      invited_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setAddOpen(false);
    setNewEmail("");
    setNewRole("player");
    await load();
  }

  async function handleDelete(entry: WhitelistEntry) {
    await supabase.from("allowed_emails").delete().eq("id", entry.id);
    setDeleteTarget(null);
    await load();
  }

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Email Whitelist</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Only listed emails can sign up. {grouped.length} {grouped.length === 1 ? "email" : "emails"}, {allEntries.length} {allEntries.length === 1 ? "role" : "roles"}.
          </p>
        </div>
        <Button onClick={openAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Email
        </Button>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  No entries yet.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map(([email, entries]) => (
                <TableRow key={email}>
                  <TableCell className="font-medium">{email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entries.map((entry) => (
                        <Badge
                          key={entry.id}
                          variant="outline"
                          className={`capitalize text-xs gap-1 pr-1 ${ROLE_COLORS[entry.app_role] ?? ""}`}
                        >
                          {ROLE_LABELS[entry.app_role]}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(entry)}
                            className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                            title={`Remove ${entry.app_role} role`}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(entries[0].created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {missingRoles(email).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => openAddForEmail(email)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Role
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
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

      {/* Add / Add Role dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{newEmail ? "Add Role" : "Add Email to Whitelist"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                type="email"
                autoFocus={!newEmail}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="player@example.com"
                readOnly={!!newEmail && rolesForEmail(newEmail.trim().toLowerCase()).length > 0}
                className={newEmail && rolesForEmail(newEmail.trim().toLowerCase()).length > 0 ? "bg-muted/40" : ""}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(newEmail && rolesForEmail(newEmail.trim().toLowerCase()).length > 0
                    ? missingRoles(newEmail.trim().toLowerCase())
                    : ALL_ROLES
                  ).map((r) => (
                    <SelectItem key={r} value={r}>
                      {r === "admin" ? "Admin" : r === "dm" ? "Dungeon Master" : "Player"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !newEmail.trim()}>
              {saving ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove role confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove role?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove the <span className="font-medium text-foreground">{deleteTarget && ROLE_LABELS[deleteTarget.app_role]}</span> role
            from <span className="font-medium text-foreground">{deleteTarget?.email}</span>?
            {allEntries.filter((e) => e.email === deleteTarget?.email).length === 1 && (
              <span className="block mt-1">This is their only role — they will no longer be able to sign up.</span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
