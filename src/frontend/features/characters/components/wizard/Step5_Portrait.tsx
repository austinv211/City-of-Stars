import { useRef } from "react";
import { Button } from "@/core/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { Upload, X } from "lucide-react";
import type { WizardState, WizardAction } from "../../types/character.types";

interface Props {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onNext: () => void;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function Step5_Portrait({ state, dispatch, onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) return;
    if (file.size > MAX_BYTES) return;

    const url = URL.createObjectURL(file);
    dispatch({ type: "SET_FIELD", field: "portraitFile", value: file });
    dispatch({ type: "SET_FIELD", field: "portraitPreviewUrl", value: url });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function clearPortrait() {
    if (state.portraitPreviewUrl) URL.revokeObjectURL(state.portraitPreviewUrl);
    dispatch({ type: "SET_FIELD", field: "portraitFile", value: null });
    dispatch({ type: "SET_FIELD", field: "portraitPreviewUrl", value: null });
    if (inputRef.current) inputRef.current.value = "";
  }

  const initials = state.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Upload a portrait for your character. This is optional — you can add or change it later.
        Accepted formats: JPEG, PNG, WebP · Max 5 MB
      </p>

      {state.portraitPreviewUrl ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-40 w-40 border-4 border-primary/20">
              <AvatarImage src={state.portraitPreviewUrl} alt={state.name} className="object-cover" />
              <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
            </Avatar>
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
              onClick={clearPortrait}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Change Portrait
          </Button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
        >
          <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/40">
            <AvatarFallback className="text-2xl bg-muted">{initials || "?"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">Drop an image here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP up to 5 MB</p>
          </div>
          <Button variant="outline" size="sm" type="button">
            <Upload className="mr-2 h-3 w-3" />
            Choose File
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={handleInputChange}
      />

      <Button className="w-full" onClick={onNext}>
        {state.portraitFile ? "Next: Review" : "Skip — Next: Review"}
      </Button>
    </div>
  );
}
