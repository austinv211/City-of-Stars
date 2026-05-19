import { useRef, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/core/components/ui/avatar";
import { Button } from "@/core/components/ui/button";
import { Camera } from "lucide-react";
import { useCharacterMutation } from "../hooks/useCharacterMutation";

interface Props {
  characterId: string;
  portraitUrl: string | null;
  name: string;
  onUpdated: (url: string) => void;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function PortraitUpload({ characterId, portraitUrl, name, onUpdated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { updatePortrait } = useCharacterMutation();
  const [uploading, setUploading] = useState(false);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !ACCEPTED.includes(file.type)) return;
    setUploading(true);
    try {
      const url = await updatePortrait(characterId, file);
      onUpdated(url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative group w-fit">
      <Avatar className="h-32 w-32 border-4 border-border">
        {portraitUrl && (
          <AvatarImage src={portraitUrl} alt={name} className="object-cover" />
        )}
        <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
      </Avatar>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        aria-label="Change portrait"
      >
        <Camera className="h-6 w-6 text-white" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={handleChange}
      />
      {uploading && (
        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60">
          <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        Change portrait
      </Button>
    </div>
  );
}
