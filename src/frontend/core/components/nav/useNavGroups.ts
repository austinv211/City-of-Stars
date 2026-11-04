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

  // A destination in more than one role's list (Schedule) shows once, in the
  // first group that has it.
  const seen = new Set(exclude);
  return groups
    .map((g) => {
      const entries = g.entries.filter((e) => !seen.has(e.to));
      for (const e of entries) seen.add(e.to);
      return { ...g, entries };
    })
    .filter((g) => g.entries.length > 0);
}
