import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Checkbox } from "@/core/components/ui/checkbox";
import { Label } from "@/core/components/ui/label";
import { useState } from "react";
import { CONDITIONS } from "@/features/characters/data/dnd2024.constants";

interface Props {
  conditions: string[];
  canEdit: boolean;
  onUpdate: (conditions: string[]) => void;
}

export function ConditionBadges({ conditions, canEdit, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<string[]>(conditions);

  function toggle(condition: string) {
    setLocal((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  }

  function save() {
    onUpdate(local);
    setOpen(false);
  }

  function openDialog() {
    setLocal(conditions);
    setOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {conditions.map((c) => (
          <Badge key={c} variant="destructive" className="text-xs">
            {c}
          </Badge>
        ))}
        {canEdit && (
          <button
            onClick={openDialog}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            {conditions.length === 0 ? "Add condition" : "Edit"}
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conditions</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {CONDITIONS.map((cond) => (
              <div key={cond} className="flex items-center gap-2">
                <Checkbox
                  id={`cond-${cond}`}
                  checked={local.includes(cond)}
                  onCheckedChange={() => toggle(cond)}
                />
                <Label htmlFor={`cond-${cond}`} className="text-sm cursor-pointer">
                  {cond}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
