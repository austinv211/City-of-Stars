import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Textarea } from "@/core/components/ui/textarea";
import { useAuth } from "@/core/context/AuthContext";
import { cn } from "@/lib/utils";
import { uploadMonsterPortrait } from "../lib/portraits";
import type { MonsterAppearance } from "../types/encounter.types";

/**
 * Nickname, flavour text, portrait and full art for one monster: everything
 * players see of it. Used per monster in the template editor and live from
 * its card.
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
  const [failed, setFailed] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <ImageSlot
          label={`portrait for ${statName}`}
          caption="Portrait"
          url={value.portrait_url}
          shape="square"
          onFailed={setFailed}
          onChange={(portrait_url) => {
            onChange({ portrait_url });
          }}
        />
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
        </div>
      </div>
      <ImageSlot
        label={`full art for ${statName}`}
        caption="Full art (optional): shown big on the encounter screen"
        url={value.art_url}
        shape="wide"
        onFailed={setFailed}
        onChange={(art_url) => {
          onChange({ art_url });
        }}
      />
      {failed && <p className="text-[11px] text-destructive">The image didn't upload. Try a smaller file.</p>}
    </div>
  );
}

/** One picture: tap to add or change it, with a way to remove it. */
function ImageSlot({
  label,
  caption,
  url,
  shape,
  onChange,
  onFailed,
}: {
  /** "portrait for Goblin": completes "Add …" / "Change …". */
  label: string;
  caption: string;
  url: string | null;
  shape: "square" | "wide";
  onChange: (url: string | null) => void;
  onFailed: (failed: boolean) => void;
}) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (!user) return;
    setUploading(true);
    const uploaded = await uploadMonsterPortrait(user.id, file);
    setUploading(false);
    onFailed(!uploaded);
    if (uploaded) onChange(uploaded);
  }

  return (
    <div className={cn("flex shrink-0 flex-col gap-1", shape === "square" ? "items-center" : "w-full")}>
      <button
        type="button"
        className={cn(
          "flex items-center justify-center gap-2 overflow-hidden border border-dashed border-border bg-muted/30 text-xs text-muted-foreground hover:bg-muted/60",
          shape === "square" ? "h-16 w-16" : "aspect-[3/1] w-full",
        )}
        onClick={() => fileRef.current?.click()}
        aria-label={`${url ? "Change" : "Add"} ${label}`}
        disabled={uploading}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <ImagePlus className="h-5 w-5 shrink-0" />
            {shape === "wide" && <span>{uploading ? "Uploading…" : caption}</span>}
          </>
        )}
      </button>
      {url && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 self-center px-1.5 text-[11px]"
          onClick={() => {
            onChange(null);
          }}
        >
          <X className="mr-0.5 h-3 w-3" /> Remove {shape === "wide" ? "art" : ""}
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
  );
}
