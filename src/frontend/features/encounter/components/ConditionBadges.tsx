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

const CONDITION_STYLE: Record<string, string> = {
  Blinded:       "bg-[hsl(var(--ctp-sapphire)/0.18)] text-ctp-sapphire border-[hsl(var(--ctp-sapphire)/0.35)]",
  Charmed:       "bg-[hsl(var(--ctp-pink)/0.18)]     text-ctp-pink     border-[hsl(var(--ctp-pink)/0.35)]",
  Deafened:      "bg-[hsl(var(--ctp-overlay0)/0.25)] text-muted-foreground border-[hsl(var(--ctp-overlay0)/0.35)]",
  Exhaustion:    "bg-[hsl(var(--ctp-maroon)/0.18)]   text-ctp-maroon   border-[hsl(var(--ctp-maroon)/0.35)]",
  Frightened:    "bg-[hsl(var(--ctp-red)/0.18)]      text-ctp-red      border-[hsl(var(--ctp-red)/0.35)]",
  Grappled:      "bg-[hsl(var(--ctp-yellow)/0.18)]   text-ctp-yellow   border-[hsl(var(--ctp-yellow)/0.35)]",
  Incapacitated: "bg-[hsl(var(--ctp-peach)/0.18)]    text-ctp-peach    border-[hsl(var(--ctp-peach)/0.35)]",
  Invisible:     "bg-[hsl(var(--ctp-lavender)/0.18)] text-ctp-lavender border-[hsl(var(--ctp-lavender)/0.35)]",
  Paralyzed:     "bg-[hsl(var(--ctp-red)/0.22)]      text-ctp-red      border-[hsl(var(--ctp-red)/0.4)]",
  Petrified:     "bg-[hsl(var(--ctp-overlay0)/0.25)] text-muted-foreground border-[hsl(var(--ctp-overlay0)/0.35)]",
  Poisoned:      "bg-[hsl(var(--ctp-green)/0.18)]    text-ctp-green    border-[hsl(var(--ctp-green)/0.35)]",
  Prone:         "bg-[hsl(var(--ctp-yellow)/0.18)]   text-ctp-yellow   border-[hsl(var(--ctp-yellow)/0.35)]",
  Restrained:    "bg-[hsl(var(--ctp-mauve)/0.18)]    text-ctp-mauve    border-[hsl(var(--ctp-mauve)/0.35)]",
  Stunned:       "bg-[hsl(var(--ctp-mauve)/0.22)]    text-ctp-mauve    border-[hsl(var(--ctp-mauve)/0.4)]",
  Unconscious:   "bg-[hsl(var(--ctp-red)/0.25)]      text-ctp-red      border-[hsl(var(--ctp-red)/0.45)]",
};

function conditionStyle(condition: string) {
  return CONDITION_STYLE[condition] ?? "bg-[hsl(var(--ctp-peach)/0.18)] text-ctp-peach border-[hsl(var(--ctp-peach)/0.35)]";
}

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
          <Badge key={c} className={`text-xs ${conditionStyle(c)}`}>
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
