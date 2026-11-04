import { useParams } from "react-router";
import { CharacterView } from "@/features/characters/components/CharacterView";
import { useCampaign } from "@/core/context/CampaignContext";

export default function DmCharacterViewPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const { isDM } = useCampaign();
  return <CharacterView characterId={characterId} viewer={isDM ? "dm" : "observer"} backTo="/dm/characters" />;
}
