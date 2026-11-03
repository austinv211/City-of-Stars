import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Textarea } from "@/core/components/ui/textarea";
import { useAuth } from "@/core/context/AuthContext";
import { uploadMonsterPortrait } from "../lib/portraits";
import type { MonsterAppearance } from "../types/encounter.types";

/**
 * Nickname, flavour text and image for one monster: everything players see
 * of it. Used per monster in the template editor and live from its card.
 */
export function MonsterAppearanceFields({
  statName,
  value,
  onChange,
}: {
  /** The stat block's name, shown as the nickname's placeholder. */
  statName: string;
  value: MonsterAppearance;
  onChange: (patch: Partial<MonsterAppearance>) => void;
}) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function upload(file: File) {
    if (!user) return;
    setUploading(true);
    const url = await uploadMonsterPortrait(user.id, file);
    setUploading(false);
    setFailed(!url);
    if (url) onChange({ portrait_url: url });
  }

  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          className="flex h-16 w-16 items-center justify-center overflow-hidden border border-dashed border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
          onClick={() => fileRef.current?.click()}
          aria-label={value.portrait_url ? `Change image for ${statName}` : `Add image for ${statName}`}
          disabled={uploading}
        >
          {value.portrait_url ? (
            <img src={value.portrait_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </button>
        {value.portrait_url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px]"
            onClick={() => {
              onChange({ portrait_url: null });
            }}
          >
            <X className="mr-0.5 h-3 w-3" /> Remove
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Input
          aria-label={`Nickname for ${statName}`}
          value={value.nickname ?? ""}
          maxLength={60}
          placeholder={`Nickname players see (default: ${statName})`}
          onChange={(e) => {
            onChange({ nickname: e.target.value.trim() ? e.target.value : null });
          }}
          className="h-8 text-sm"
        />
        <Textarea
          aria-label={`Description of ${statName} shown to players`}
          value={value.description ?? ""}
          onChange={(e) => {
            onChange({ description: e.target.value || null });
          }}
          placeholder="What players see: looks, mannerisms, a line of flavour…"
          rows={2}
          className="resize-none text-xs"
        />
        {uploading && <p className="text-[11px] text-muted-foreground">Uploading image…</p>}
        {failed && <p className="text-[11px] text-destructive">The image didn't upload. Try a smaller file.</p>}
      </div>
    </div>
  );
}
