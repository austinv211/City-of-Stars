import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Checkbox } from "@/core/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Input } from "@/core/components/ui/input";
import type { Character } from "@/features/characters/types/character.types";
import type { PartyEntry } from "@/features/dm/hooks/useEncounterManager";
import type { Encounter } from "@/features/encounter/types/encounter.types";
import { defaultStartHp, maxHpOf } from "../lib/hp";
import { HpEntry } from "./HpEntry";

/**
 * Who joins the fight, and with what HP and AC.
 *
 * Records only what the DM changed (who they left out, HP/AC they overrode)
 * rather than a snapshot taken on open: a snapshot taken before the
 * campaign's characters had loaded was empty, and the encounter then ran with
 * no party at all. Mount it with a `key` per encounter so it starts fresh.
 */
export function StartEncounterDialog({
  encounter,
  characters,
  onClose,
  onStart,
}: {
  encounter: Encounter | null;
  characters: Character[];
  onClose: () => void;
  onStart: (party: PartyEntry[]) => Promise<void>;
}) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [hp, setHp] = useState<Record<string, number>>({});
  const [ac, setAc] = useState<Record<string, number>>({});
  const [starting, setStarting] = useState(false);

  const startHp = (c: Character) => hp[c.id] ?? defaultStartHp(c);
  const startAc = (c: Character) => ac[c.id] ?? c.ac;
  const verb = encounter?.is_template ? "Run" : "Start";

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  async function start() {
    setStarting(true);
    await onStart(
      characters
        .filter((c) => !excluded.has(c.id))
        .map((c) => ({
          characterId: c.id,
          name: c.name,
          ownerId: c.owner_id,
          portraitUrl: c.portrait_url,
          artUrl: c.art_url,
          hp: startHp(c),
          hpMax: maxHpOf(c),
          hpTemp: c.hp_temp,
          sheetHp: c.hp_current,
          ac: startAc(c),
        })),
    );
    setStarting(false);
  }

  return (
    <Dialog
      open={!!encounter}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {verb}: {encounter?.name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose who joins, and their HP and AC as they enter the fight.
        </p>
        {characters.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No active characters in this campaign.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {characters.map((c) => (
              <PartyRow
                key={c.id}
                character={c}
                included={!excluded.has(c.id)}
                hp={startHp(c)}
                ac={startAc(c)}
                onToggle={() => {
                  toggle(c.id);
                }}
                onHp={(v) => {
                  setHp((prev) => ({ ...prev, [c.id]: v }));
                }}
                onAc={(v) => {
                  setAc((prev) => ({ ...prev, [c.id]: v }));
                }}
              />
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              void start();
            }}
            disabled={starting}
          >
            {starting ? `${verb === "Run" ? "Running" : "Starting"}…` : `${verb} Encounter`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PartyRow({
  character: c,
  included,
  hp,
  ac,
  onToggle,
  onHp,
  onAc,
}: {
  character: Character;
  included: boolean;
  hp: number;
  ac: number;
  onToggle: () => void;
  onHp: (hp: number) => void;
  onAc: (ac: number) => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
      <Checkbox aria-label={`Include ${c.name}`} checked={included} onCheckedChange={onToggle} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{c.name}</p>
        <p className="text-xs text-muted-foreground">
          {c.class} {c.level}
        </p>
      </div>
      <HpEntry
        label={`${c.name} starting HP`}
        value={hp}
        max={maxHpOf(c)}
        disabled={!included}
        onChange={onHp}
      />
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span aria-hidden="true">AC</span>
        <Input
          type="number"
          min={1}
          aria-label={`${c.name} AC`}
          value={ac}
          disabled={!included}
          onChange={(e) => {
            onAc(Math.max(1, Number(e.target.value) || 1));
          }}
          className="h-8 w-14 px-1 text-center"
        />
      </div>
    </li>
  );
}
