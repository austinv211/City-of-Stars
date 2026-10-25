import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { signedIn, USERS, type Client } from "./clients";
import { setupRlsFixture, teardownRlsFixture, type RlsFixture } from "./fixture";

/**
 * Campaign isolation: the core promise of the whole RLS model. All
 * authorisation in this app is row-level security, and the anon key ships in
 * the bundle, so "can a signed-in user see a campaign they are not in" is the
 * question that matters most.
 */

let fx: RlsFixture;
let member: Client;
let outsider: Client;

beforeAll(async () => {
  fx = await setupRlsFixture();
  [member, outsider] = await Promise.all([
    signedIn(USERS.player1),
    signedIn(USERS.player2),
  ]);
});

afterAll(teardownRlsFixture);

// Each row: a table and the id of a fixture row in it. RLS hides rows rather than erroring, so "cannot read" means
// an empty result, not a rejected request.
const scoped = [
  ["campaigns", () => fx.campaignId],
  ["characters", () => fx.characterId],
  ["custom_monsters", () => fx.monsterId],
  ["encounters", () => fx.encounterId],
  ["encounter_participants", () => fx.playerParticipantId],
  ["dice_rolls", () => fx.diceRollId],
] as const;

describe("a player outside the campaign", () => {
  it.each(scoped)("cannot read its %s", async (table, id) => {
    const { data, error } = await outsider.from(table).select("id").eq("id", id());
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot read its membership list", async () => {
    const { data } = await outsider
      .from("campaign_members")
      .select("user_id")
      .eq("campaign_id", fx.campaignId);
    expect(data).toEqual([]);
  });

  it("is not a member according to is_campaign_member()", async () => {
    const { data } = await outsider.rpc("is_campaign_member", {
      _campaign_id: fx.campaignId,
    });
    expect(data).toBe(false);
  });

  it("is not the DM according to is_campaign_dm()", async () => {
    const { data } = await outsider.rpc("is_campaign_dm", {
      _campaign_id: fx.campaignId,
    });
    expect(data).toBe(false);
  });
});

// The positive control. Without it, a policy that hides everything from
// everyone would pass every test above.
describe("a player inside the campaign", () => {
  it.each(scoped)("can read its %s", async (table, id) => {
    const { data, error } = await member.from(table).select("id").eq("id", id());
    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  it("is a member but not the DM", async () => {
    const [isMember, isDm] = await Promise.all([
      member.rpc("is_campaign_member", { _campaign_id: fx.campaignId }),
      member.rpc("is_campaign_dm", { _campaign_id: fx.campaignId }),
    ]);
    expect(isMember.data).toBe(true);
    expect(isDm.data).toBe(false);
  });
});
