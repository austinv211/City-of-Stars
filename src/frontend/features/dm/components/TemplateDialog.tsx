import { useState } from "react";
import { BookOpen, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Separator } from "@/core/components/ui/separator";
import type { NpcDraft } from "@/features/dm/hooks/useEncounterManager";
import { BLANK_NPC, type TemplateDraft } from "../lib/templateDraft";
import { MonsterAppearanceFields } from "@/features/encounter/components/MonsterAppearanceFields";
import { MonsterPicker, type CustomMonster } from "@/features/encounter/components/MonsterPicker";
import type { MonsterAppearance } from "@/features/encounter/types/encounter.types";

/**
 * Create or edit an encounter template: its name and monsters, each with the
 * nickname, flavour text and image players will see. Mount it with a `key`
 * per draft so it starts from that draft.
 */
export function TemplateDialog({
  draft,
  customMonsters,
  onLibraryChange,
  onClose,
  onSave,
}: {
  draft: TemplateDraft | null;
  customMonsters: CustomMonster[];
  onLibraryChange: () => void;
  onClose: () => void;
  onSave: (draft: TemplateDraft) => Promise<void>;
}) {
  const [name, setName] = useState(draft?.name ?? "");
  const [npcs, setNpcs] = useState<NpcDraft[]>(draft?.npcs ?? [{ ...BLANK_NPC }]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const editing = !!draft?.id;

  function addFromPicker(npc: NpcDraft) {
    setNpcs((prev) => (prev.length === 1 && !prev[0].name.trim() ? [npc] : [...prev, npc]));
    setPickerOpen(false);
  }

  async function save() {
    if (!draft || !name.trim()) return;
    setSaving(true);
    await onSave({ id: draft.id, name: name.trim(), npcs: npcs.filter((n) => n.name.trim()) });
    setSaving(false);
  }

  return (
    <Dialog
      open={!!draft}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Template" : "New Encounter Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              placeholder="Goblin Ambush…"
            />
          </div>

          <Separator />

          <MonsterList
            npcs={npcs}
            setNpcs={setNpcs}
            onPick={() => {
              setPickerOpen(true);
            }}
          />

          {pickerOpen && (
            <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Monster Picker</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPickerOpen(false);
                  }}
                >
                  Close
                </Button>
              </div>
              <MonsterPicker
                customMonsters={customMonsters}
                onSelect={addFromPicker}
                onLibraryChange={onLibraryChange}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void save();
            }}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : editing ? "Save Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The template's monsters: add, edit, duplicate and remove. */
function MonsterList({
  npcs,
  setNpcs,
  onPick,
}: {
  npcs: NpcDraft[];
  setNpcs: React.Dispatch<React.SetStateAction<NpcDraft[]>>;
  onPick: () => void;
}) {
  const patchNpc = (idx: number, patch: Partial<NpcDraft>) => {
    setNpcs((prev) => prev.map((n, i) => (i === idx ? { ...n, ...patch } : n)));
  };
  return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Monsters</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPick}
                >
                  <BookOpen className="h-3 w-3 mr-1.5" />
                  Pick Monster
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNpcs((prev) => [...prev, { ...BLANK_NPC }]);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Blank
                </Button>
              </div>
            </div>

            {npcs.map((npc, idx) => (
              <TemplateNpcRow
                // Rows have no id until saved; the index is their identity here.
                key={idx}
                npc={npc}
                onChange={(patch) => {
                  patchNpc(idx, patch);
                }}
                onDuplicate={() => {
                  // A copy of the stat block, without the copy's identity.
                  const { nickname: _n, portrait_url: _p, ...stats } = npc;
                  setNpcs((prev) => [...prev.slice(0, idx + 1), stats, ...prev.slice(idx + 1)]);
                }}
                onRemove={() => {
                  setNpcs((prev) => prev.filter((_, i) => i !== idx));
                }}
              />
            ))}
          </div>
  );
}

const toAppearance = (npc: NpcDraft): MonsterAppearance => ({
  nickname: npc.nickname ?? null,
  description: npc.description ?? null,
  portrait_url: npc.portrait_url ?? null,
});

/** A draft's absent field is the appearance form's null. */
const fromAppearance = (patch: Partial<MonsterAppearance>): Partial<NpcDraft> =>
  Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v ?? undefined]));

function NumberCell({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground" aria-hidden="true">
        {label}
      </span>
      <Input
        type="number"
        min={min}
        aria-label={label}
        value={value}
        onChange={(e) => {
          onChange(Math.max(min ?? -99, Number(e.target.value) || (min ?? 0)));
        }}
        className="h-8 w-16 px-1 text-center"
      />
    </div>
  );
}

function TemplateNpcRow({
  npc,
  onChange,
  onDuplicate,
  onRemove,
}: {
  npc: NpcDraft;
  onChange: (patch: Partial<NpcDraft>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const statName = npc.name.trim() || "this monster";
  return (
    <div className="space-y-2 border rounded-md p-2 bg-muted/10">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground" aria-hidden="true">
            Stat block
          </span>
          <Input
            aria-label="Monster name"
            value={npc.name}
            onChange={(e) => {
              onChange({ name: e.target.value });
            }}
            placeholder="Monster name"
            className="h-8"
          />
        </div>
        <NumberCell label="HP" min={1} value={npc.hp} onChange={(hp) => { onChange({ hp }); }} />
        <NumberCell label="AC" min={1} value={npc.ac} onChange={(ac) => { onChange({ ac }); }} />
        <NumberCell label="Init" value={npc.initiative} onChange={(initiative) => { onChange({ initiative }); }} />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={onDuplicate}
          aria-label={`Duplicate ${statName}`}
          title="Add another of these"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove ${statName}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <MonsterAppearanceFields
        statName={npc.name.trim() || "Monster"}
        value={toAppearance(npc)}
        onChange={(patch) => {
          onChange(fromAppearance(patch));
        }}
      />
    </div>
  );
}
