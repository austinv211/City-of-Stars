import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/core/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select";
import { ALL_ROLES, type AppRole } from "../hooks/useWhitelist";

const ROLE_FULL_LABELS: Record<AppRole, string> = { admin: "Admin", dm: "Dungeon Master", player: "Player" };

interface Props {
  /** Adding a role to this existing email, or a new email when null. */
  existingEmail: string | null;
  existingRoles: AppRole[];
  onClose: () => void;
  onAdd: (email: string, role: AppRole) => Promise<{ error?: string }>;
}

/** Whitelists a new email, or gives an existing one another role. */
export function AddWhitelistDialog({ existingEmail, existingRoles, onClose, onAdd }: Props) {
  const roles = existingEmail ? ALL_ROLES.filter((r) => !existingRoles.includes(r)) : ALL_ROLES;
  const [email, setEmail] = useState(existingEmail ?? "");
  const [role, setRole] = useState<AppRole>(roles[0] ?? "player");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setSaving(true);
    const result = await onAdd(normalized, role);
    setSaving(false);
    if (result.error) setError(result.error);
    else onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existingEmail ? "Add Role" : "Add Email to Whitelist"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleAdd();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="whitelist-email">Email Address</Label>
            <Input
              id="whitelist-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              readOnly={!!existingEmail}
              className={existingEmail ? "bg-muted/40" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whitelist-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger id="whitelist-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_FULL_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleAdd()} disabled={saving || !email.trim()}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
