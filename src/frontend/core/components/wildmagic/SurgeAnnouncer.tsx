import { useCallback, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Button } from "@/core/components/ui/button";
import { RichText } from "@/core/components/RichText";
import { useAuth } from "@/core/context/AuthContext";
import { useCampaign } from "@/core/context/CampaignContext";
import { fetchCharacterBrief, useSurgeFeed, type CharacterSurge } from "@/core/hooks/useCharacterSurges";

interface Announcement {
  surge: CharacterSurge;
  characterName: string;
}

/**
 * Wherever they are in the app, the player whose character surges gets the
 * full description up front; everyone else at the table gets a toast.
 */
export function SurgeAnnouncer() {
  const { user } = useAuth();
  const { campaign } = useCampaign();
  const [shown, setShown] = useState<Announcement | null>(null);

  const onSurge = useCallback(
    (surge: CharacterSurge) => {
      void fetchCharacterBrief(surge.character_id).then((brief) => {
        const characterName = brief?.name ?? "Someone";
        if (brief && brief.owner_id === user?.id) {
          setShown({ surge, characterName });
        } else {
          toast(`Wild magic surges around ${characterName}`, {
            description: surge.name,
            icon: <Sparkles className="h-4 w-4 text-surge" />,
          });
        }
      });
    },
    [user?.id],
  );

  useSurgeFeed(campaign?.id, onSurge);

  return (
    <Dialog open={!!shown} onOpenChange={(open) => !open && setShown(null)}>
      <DialogContent className="wild-surge max-w-md border-surge/50">
        <DialogHeader>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-surge">
            <Sparkles className="h-4 w-4 animate-pulse" aria-hidden />
            Wild magic surge{shown?.surge.roll != null && ` · ${String(shown.surge.roll)}`}
          </p>
          <DialogTitle className="text-xl">{shown?.surge.name}</DialogTitle>
          <DialogDescription>The weave twists around {shown?.characterName}.</DialogDescription>
        </DialogHeader>
        {shown?.surge.description && <RichText>{shown.surge.description}</RichText>}
        <DialogFooter>
          <Button onClick={() => setShown(null)}>So be it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
