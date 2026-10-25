import { useCampaign } from "@/core/context/CampaignContext";
import { useAuth } from "@/core/context/AuthContext";
import { playerNav, dmNav, adminNav, type NavEntry } from "./navConfig";

export interface NavGroup {
  key: string;
  /** Omitted for the player group, which leads and needs no introduction. */
  heading?: { text: string; tone: string };
  entries: NavEntry[];
}

/** The groups this account may see, in display order. */
export function useNavGroups(exclude: readonly string[]): NavGroup[] {
  const { isDM } = useCampaign();
  const { isAdmin, isPlayerRole } = useAuth();

  const groups: NavGroup[] = [];
  if (isPlayerRole) groups.push({ key: "player", entries: playerNav });
  if (isDM || isAdmin) {
    groups.push({
      key: "dm",
      heading: { text: "DM Tools", tone: "text-primary" },
      entries: dmNav,
    });
  }
  if (isAdmin) {
    groups.push({
      key: "admin",
      heading: { text: "Admin", tone: "text-destructive" },
      entries: adminNav,
    });
  }

  return groups
    .map((g) => ({ ...g, entries: g.entries.filter((e) => !exclude.includes(e.to)) }))
    .filter((g) => g.entries.length > 0);
}
