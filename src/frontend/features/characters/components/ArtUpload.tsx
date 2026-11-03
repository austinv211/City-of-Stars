import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { useCharacterMutation } from "../hooks/useCharacterMutation";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * A character's full art: a banner-sized picture the encounter screen shows
 * in place of the round portrait. Optional; owners can add, change or remove
 * it, everyone else just sees it.
 */
export function ArtUpload({
  characterId,
  artUrl,
  name,
  canEdit,
  onUpdated,
}: {
  characterId: string;
  artUrl: string | null;
  name: string;
  canEdit: boolean;
  onUpdated: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateImage, clearArt } = useCharacterMutation();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!artUrl && !canEdit) return null;

  async function upload(file: File) {
    if (!ACCEPTED.includes(file.type)) return;
    setBusy(true);
    setFailed(false);
    try {
      onUpdated(await updateImage(characterId, "art", file));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    await clearArt(characterId);
    onUpdated(null);
    setBusy(false);
  }

  const pick = () => inputRef.current?.click();

  return (
    <div className="space-y-1">
      {artUrl ? (
        <div className="group relative aspect-[3/1] w-full overflow-hidden border border-border bg-muted">
          <img src={artUrl} alt={`${name}, full art`} className="h-full w-full object-cover" />
          {canEdit && (
            <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={pick} disabled={busy}>
                Change art
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="h-7 w-7 p-0"
                onClick={() => void remove()}
                disabled={busy}
                aria-label="Remove full art"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <ImagePlus className="h-4 w-4" />
          {busy ? "Uploading…" : "Add full art: a bigger picture for the encounter screen"}
        </button>
      )}
      {failed && <p className="text-xs text-destructive">The image didn't upload. Try a smaller JPEG, PNG or WebP.</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
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
