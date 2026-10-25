import { test as base, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { admin, must } from "./support/admin";
import { USERS, storageStatePath, type Role } from "./support/users";

/**
 * Per-test isolation by campaign, not by truncation (plan §2.5): every test
 * gets a campaign of its own, created through the service role and deleted
 * afterwards -- every child row cascades from it -- so specs run in parallel
 * without seeing each other's encounters.
 *
 *   dm       DM of the campaign (the add_campaign_creator_as_dm trigger)
 *   player1  member, owns `characters.player1`
 *   player2  member, owns `characters.player2`
 *
 * plus one encounter template, "Goblin Ambush", with a single goblin in it.
 */
export interface TestCampaign {
  id: string;
  name: string;
  characters: Record<"player1" | "player2", { id: string; name: string }>;
  templateId: string;
}

/** A signed-in page for `role`, already looking at the test's campaign. */
type OpenAs = (role: Role) => Promise<Page>;

const CHARACTERS = {
  player1: {
    name: "Isolde Brightwater",
    class: "Fighter",
    species: "Human",
    background: "Soldier",
  },
  player2: {
    name: "Corin Ashgrove",
    class: "Rogue",
    species: "Halfling",
    background: "Criminal",
  },
} as const;

async function createCampaign(title: string): Promise<TestCampaign> {
  const db = admin();
  const id = randomUUID();
  const name = `E2E ${title}`.slice(0, 80);

  must(
    await db
      .from("campaigns")
      .insert({ id, name, created_by: USERS.dm.id })
      .select("id")
      .single(),
    "campaign",
  );
  must(
    await db
      .from("campaign_members")
      .insert(
        (["player1", "player2"] as const).map((p) => ({
          campaign_id: id,
          user_id: USERS[p].id,
          role: "player",
        })),
      )
      .select("id"),
    "memberships",
  );

  const characters = {} as TestCampaign["characters"];
  for (const p of ["player1", "player2"] as const) {
    const c = must(
      await db
        .from("characters")
        .insert({
          campaign_id: id,
          owner_id: USERS[p].id,
          ...CHARACTERS[p],
          level: 3,
          status: "active",
          hp_max: 28,
          hp_current: 28,
          ac: 16,
        })
        .select("id, name")
        .single(),
      `${p} character`,
    );
    must(
      await db
        .from("ability_scores")
        .insert({
          character_id: c.id,
          strength: 14,
          dexterity: 14, // +2 initiative
          constitution: 13,
          intelligence: 10,
          wisdom: 12,
          charisma: 8,
          method: "standard_array",
        })
        .select("character_id")
        .single(),
      `${p} ability scores`,
    );
    characters[p] = c;
  }

  const template = must(
    await db
      .from("encounters")
      .insert({
        campaign_id: id,
        created_by: USERS.dm.id,
        name: "Goblin Ambush",
        status: "pending",
        is_template: true,
      })
      .select("id")
      .single(),
    "template",
  );
  must(
    await db
      .from("encounter_participants")
      .insert({
        encounter_id: template.id,
        name: "Goblin",
        is_player: false,
        hp_current: 7,
        hp_max: 7,
        ac: 15,
        dex_score: 14,
        initiative_order: 1,
        initiative_score: 2,
      })
      .select("id")
      .single(),
    "template goblin",
  );

  return { id, name, characters, templateId: template.id };
}

async function deleteCampaign(id: string) {
  const { error } = await admin().from("campaigns").delete().eq("id", id);
  if (error) throw new Error(`e2e teardown: campaign ${id}: ${error.message}`);
}

/** Matches CampaignContext's STORAGE_KEY: which campaign the app opens on. */
const SELECTED_CAMPAIGN_KEY = "cityofstars:selectedCampaign";

async function openContext(
  browser: Browser,
  role: Role,
  campaignId: string,
  use: object,
) {
  const context = await browser.newContext({
    ...use,
    storageState: storageStatePath(role),
  });
  await context.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [SELECTED_CAMPAIGN_KEY, campaignId] as const,
  );
  return context;
}

export const test = base.extend<{ campaign: TestCampaign; openAs: OpenAs }>({
  // Playwright reads a fixture's dependencies from its first parameter's
  // destructuring pattern, so "no dependencies" has to be spelled `{}`.
  // eslint-disable-next-line no-empty-pattern
  campaign: async ({}, use, testInfo) => {
    const campaign = await createCampaign(testInfo.titlePath.slice(1).join(" › "));
    await use(campaign);
    await deleteCampaign(campaign.id);
  },

  /**
   * One browser context per role, so a spec can put the DM and the players
   * side by side -- the automated version of `dev.ps1 dev-multi`. Contexts
   * inherit the project's device settings (viewport, touch).
   */
  openAs: async (
    { browser, campaign, viewport, hasTouch, isMobile, deviceScaleFactor, userAgent },
    use,
  ) => {
    const contexts: Awaited<ReturnType<typeof openContext>>[] = [];
    const device = { viewport, hasTouch, isMobile, deviceScaleFactor, userAgent };
    await use(async (role) => {
      const context = await openContext(browser, role, campaign.id, device);
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((c) => c.close()));
  },
});

export { expect } from "@playwright/test";
