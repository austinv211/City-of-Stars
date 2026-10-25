import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/core/components/ui/responsive-dialog";
import type { EffectExpiry, EncounterParticipant } from "../../types/encounter.types";
import type { NewEffect } from "../../hooks/useEncounterEffects";
import { EXPIRY_OPTIONS } from "../../lib/effects";

const NO_SOURCE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: EncounterParticipant[];
  /** Set for players: they are the source of every effect they place. */
  fixedSourceId: string | null;
  defaultTargetId: string | null;
  onAdd: (effect: NewEffect) => Promise<string | null>;
}

/**
 * Place a tracked effect. The DM may pick any source (or none); a player is
 * always the source of what they place -- that is also what the RLS policy
 * allows, so the form does not offer what the server would refuse.
 */
export function AddEffectDialog(props: Props) {
  const { open, onOpenChange, participants, fixedSourceId } = props;
  const form = useEffectForm(props);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent widthClassName="md:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add effect</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="space-y-3">
          <TextField
            id="effect-name"
            label="Effect"
            placeholder="e.g. Bless, Hold Person, Prone"
            value={form.name}
            onChange={form.setName}
          />
          <ParticipantSelect
            id="effect-target"
            label="On"
            value={form.targetId}
            onChange={form.setTargetId}
            participants={participants}
          />
          {!fixedSourceId && (
            <ParticipantSelect
              id="effect-source"
              label="From"
              value={form.sourceId}
              onChange={form.setSourceId}
              participants={participants}
              noneLabel="No source"
            />
          )}
          <ExpirySelect
            value={form.expiry}
            onChange={form.setExpiry}
            missingSource={form.needsSource && !form.source}
          />
          {form.expiry === "rounds" && (
            <TextField
              id="effect-rounds"
              label="Rounds"
              type="number"
              value={String(form.rounds)}
              onChange={(v) => {
                form.setRounds(Math.max(1, Number(v) || 1));
              }}
            />
          )}
          {form.error && <p className="text-xs text-destructive">{form.error}</p>}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={!form.valid || form.saving}
            onClick={() => void form.submit()}
          >
            Add effect
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function useEffectForm({
  participants,
  fixedSourceId,
  defaultTargetId,
  onAdd,
  onOpenChange,
}: Props) {
  const [name, setName] = useState("");
  const [targetId, setTargetId] = useState(
    defaultTargetId ?? participants.at(0)?.id ?? "",
  );
  const [sourceId, setSourceId] = useState<string>(fixedSourceId ?? NO_SOURCE);
  const [expiry, setExpiry] = useState<EffectExpiry>("rounds");
  const [rounds, setRounds] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const source = fixedSourceId ?? (sourceId === NO_SOURCE ? null : sourceId);
  const needsSource = EXPIRY_OPTIONS.some((o) => o.value === expiry && o.needsSource);
  const valid = name.trim().length > 0 && !!targetId && (!needsSource || !!source);

  async function submit() {
    setSaving(true);
    const err = await onAdd({
      targetParticipantId: targetId,
      sourceParticipantId: source,
      name,
      expiry,
      roundsRemaining: rounds,
    });
    setSaving(false);
    setError(err);
    if (err) return;
    setName("");
    onOpenChange(false);
  }

  return {
    name,
    setName,
    targetId,
    setTargetId,
    sourceId,
    setSourceId,
    expiry,
    setExpiry,
    rounds,
    setRounds,
    error,
    saving,
    source,
    needsSource,
    valid,
    submit,
  };
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={type === "number" ? 1 : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
}

function ExpirySelect({
  value,
  onChange,
  missingSource,
}: {
  value: EffectExpiry;
  onChange: (v: EffectExpiry) => void;
  missingSource: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="effect-expiry">Lasts</Label>
      <Select
        value={value}
        onValueChange={(v) => {
          onChange(v as EffectExpiry);
        }}
      >
        <SelectTrigger id="effect-expiry">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EXPIRY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {missingSource && (
        <p className="text-xs text-destructive">This needs a source.</p>
      )}
    </div>
  );
}

function ParticipantSelect({
  id,
  label,
  value,
  onChange,
  participants,
  noneLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  participants: EncounterParticipant[];
  noneLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {noneLabel && <SelectItem value={NO_SOURCE}>{noneLabel}</SelectItem>}
          {participants.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
