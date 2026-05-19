import { useEffect, useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Badge } from "@/core/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/core/context/AuthContext";

interface WhitelistEntry {
  id: string;
  email: string;
  app_role: "admin" | "dm" | "player";
  created_at: string;
}

const PAGE_SIZE = 10;

const ROLE_COLORS: Record<string, string> = {
  admin: "text-red-500 border-red-500/30",
  dm: "text-purple-500 border-purple-500/30",
  player: "",
};

export default function AdminWhitelistPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "dm" | "player">("player");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<WhitelistEntry | null>(null);

  async function load(p = page) {
    setLoading(true);
    const from = p * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("allowed_emails")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    setEntries((data as WhitelistEntry[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }

  useEffect(() => { load(page); }, [page]);

  async function handleAdd() {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setSaving(true);
    setAddError(null);
    const { error } = await supabase.from("allowed_emails").insert({
      email,
      app_role: newRole,
      invited_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      setAddError(error.message.includes("unique") ? "Email already on the whitelist." : error.message);
      return;
    }
    setAddOpen(false);
    setNewEmail("");
    setNewRole("player");
    setPage(0);
    load(0);
  }

  async function handleDelete(entry: WhitelistEntry) {
    await supabase.from("allowed_emails").delete().eq("id", entry.id);
    setDeleteTarget(null);
    load(page);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="px-4 sm:px-6 py-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Email Whitelist</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Only listed emails can sign up. {total} {total === 1 ? "entry" : "entries"}.
          </p>
        </div>
        <Button onClick={() => { setAddOpen(true); setAddError(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Email
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">No entries yet.</p>
      ) : (
        <>
          <div className="rounded-lg border divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`capitalize text-xs shrink-0 ${ROLE_COLORS[entry.app_role] ?? ""}`}
                >
                  {entry.app_role}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setDeleteTarget(entry)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
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
        </>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Email to Whitelist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                type="email"
                autoFocus
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="player@example.com"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="dm">Dungeon Master</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove from whitelist?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{deleteTarget?.email}</span> will no longer be able to sign up.
            Existing accounts are not affected.
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
