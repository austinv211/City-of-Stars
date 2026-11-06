import {
  Anchor,
  Castle,
  Compass,
  Crown,
  Eye,
  Flame,
  Gem,
  Ghost,
  Moon,
  Mountain,
  Scroll,
  Shield,
  Ship,
  Skull,
  Sun,
  Swords,
  Trees,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * The icons a DM can give a campaign, shown beside its name in the
 * navigation. The ids are stored in `campaigns.icon`, whose check constraint
 * (migration 20261106000001_campaign_icon) lists the same ids;
 * campaignIcons.test.ts keeps the two in step.
 */
export const CAMPAIGN_ICONS = [
  { id: "castle", label: "Castle", Icon: Castle },
  { id: "crown", label: "Crown", Icon: Crown },
  { id: "skull", label: "Skull", Icon: Skull },
  { id: "swords", label: "Swords", Icon: Swords },
  { id: "shield", label: "Shield", Icon: Shield },
  { id: "flame", label: "Flame", Icon: Flame },
  { id: "moon", label: "Moon", Icon: Moon },
  { id: "sun", label: "Sun", Icon: Sun },
  { id: "mountain", label: "Mountain", Icon: Mountain },
  { id: "trees", label: "Forest", Icon: Trees },
  { id: "ship", label: "Ship", Icon: Ship },
  { id: "anchor", label: "Anchor", Icon: Anchor },
  { id: "compass", label: "Compass", Icon: Compass },
  { id: "gem", label: "Gem", Icon: Gem },
  { id: "scroll", label: "Scroll", Icon: Scroll },
  { id: "wand", label: "Wand", Icon: WandSparkles },
  { id: "eye", label: "Eye", Icon: Eye },
  { id: "ghost", label: "Ghost", Icon: Ghost },
] as const satisfies readonly { id: string; label: string; Icon: LucideIcon }[];

export type CampaignIconId = (typeof CAMPAIGN_ICONS)[number]["id"];

/** The icon for a stored id, or undefined for none (or one this build doesn't know). */
export function findCampaignIcon(id: string | null | undefined) {
  return CAMPAIGN_ICONS.find((icon) => icon.id === id);
}
