import { useParams } from "react-router";
import { CharacterView } from "../components/CharacterView";

export default function CharacterViewPage() {
  const { characterId } = useParams<{ characterId: string }>();
  return <CharacterView characterId={characterId} viewer="player" backTo={-1} />;
}
