import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/core/components/ui/responsive-dialog";
import { MonsterAppearanceFields } from "../MonsterAppearanceFields";
import type { EncounterParticipant, MonsterAppearance } from "../../types/encounter.types";

/**
 * The DM renames or re-describes a monster mid-fight, e.g. once the party
 * learns who it is. Players see the change live. Mount with a `key` per
 * monster so it starts from that monster's current appearance.
 */
export function EditAppearanceDialog({
  participant,
  onClose,
  onSave,
}: {
  /** The raw row: `name` is the stat block's, not the on-screen label. */
  participant: EncounterParticipant | null;
  onClose: () => void;
  onSave: (id: string, appearance: MonsterAppearance) => Promise<void>;
}) {
  const [value, setValue] = useState<MonsterAppearance>({
    nickname: participant?.nickname ?? null,
    description: participant?.description ?? null,
    portrait_url: participant?.portrait_url ?? null,
    art_url: participant?.art_url ?? null,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!participant) return;
    setSaving(true);
    const nickname = (value.nickname ?? "").trim();
    await onSave(participant.id, { ...value, nickname: nickname.length > 0 ? nickname : null });
    setSaving(false);
    onClose();
  }

  return (
    <ResponsiveDialog
      open={!!participant}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent widthClassName="md:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>How players see {participant?.name}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody>
          <MonsterAppearanceFields
            statName={participant?.name ?? "Monster"}
            value={value}
            onChange={(patch) => {
              setValue((prev) => ({ ...prev, ...patch }));
            }}
          />
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void save();
            }}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
