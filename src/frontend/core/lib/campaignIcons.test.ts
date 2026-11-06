import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAMPAIGN_ICONS, findCampaignIcon } from "./campaignIcons";

const MIGRATION = "supabase/migrations/20261106000001_campaign_icon.sql";

describe("campaign icons", () => {
  it("are exactly the ids the database accepts", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const list = /icon in \(([^)]*)\)/.exec(sql)?.[1] ?? "";
    const allowed = [...list.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(allowed.sort()).toEqual(CAMPAIGN_ICONS.map((i) => i.id).sort());
  });

  it("finds an icon by id, and nothing for none or an unknown id", () => {
    expect(findCampaignIcon("castle")?.label).toBe("Castle");
    expect(findCampaignIcon(null)).toBeUndefined();
    expect(findCampaignIcon("dragon")).toBeUndefined();
  });
});
