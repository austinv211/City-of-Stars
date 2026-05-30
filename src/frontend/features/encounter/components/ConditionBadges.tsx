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
import { SHEET_CONDITIONS as CONDITIONS, CONDITION_EFFECTS } from "@/features/characters/data/rules2024";

const CONDITION_STYLE: Record<string, string> = {
  Blinded:       "bg-[#74c7ec2e] text-[#74c7ec] border-[#74c7ec59]",
  Charmed:       "bg-[#f5c2e72e] text-[#f5c2e7] border-[#f5c2e759]",
  Deafened:      "bg-muted/25 text-muted-foreground border-muted-foreground/35",
  Exhaustion:    "bg-[#eba0ac2e] text-[#eba0ac] border-[#eba0ac59]",
  Frightened:    "bg-[#f38ba82e] text-[#f38ba8] border-[#f38ba859]",
  Grappled:      "bg-[#f9e2af2e] text-[#f9e2af] border-[#f9e2af59]",
  Incapacitated: "bg-[#fab3872e] text-[#fab387] border-[#fab38759]",
  Invisible:     "bg-[#b4befe2e] text-[#b4befe] border-[#b4befe59]",
  Paralyzed:     "bg-[#f38ba838] text-[#f38ba8] border-[#f38ba866]",
  Petrified:     "bg-muted/25 text-muted-foreground border-muted-foreground/35",
  Poisoned:      "bg-[#a6e3a12e] text-[#a6e3a1] border-[#a6e3a159]",
  Prone:         "bg-[#f9e2af2e] text-[#f9e2af] border-[#f9e2af59]",
  Restrained:    "bg-[#cba6f72e] text-[#cba6f7] border-[#cba6f759]",
  Stunned:       "bg-[#cba6f738] text-[#cba6f7] border-[#cba6f766]",
  Unconscious:   "bg-[#f38ba840] text-[#f38ba8] border-[#f38ba873]",
};

function conditionStyle(condition: string) {
  return CONDITION_STYLE[condition] ?? "bg-[#fab3872e] text-[#fab387] border-[#fab38759]";
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
          <Button
            variant="ghost"
            size="sm"
            onClick={openDialog}
            className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {conditions.length === 0 ? "Add condition" : "Edit"}
          </Button>
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
                <Label htmlFor={`cond-${cond}`} className="text-sm cursor-pointer" title={CONDITION_EFFECTS[cond]?.note}>
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
