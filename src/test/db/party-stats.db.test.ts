import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { service, signedIn, USERS, type Client } from "./clients";
import { setupRlsFixture, teardownRlsFixture, type RlsFixture } from "./fixture";

/**
 * increment_party_stat: the campaign's running tallies (crits, fumbles,
 * damage dealt, ...) bumped from every client's dice rolls.
 *
 * It replaced a client-side read-modify-write on party_stats.stats that had
 * two defects: concurrent rolls lost counts, and -- since party_stats is
 * DM-write only -- every PLAYER's increment was silently refused by RLS, so
 * the tallies only ever counted the DM's rolls.
 */

let fx: RlsFixture;
let dm: Client;
let player: Client;
let outsider: Client;

beforeAll(async () => {
  fx = await setupRlsFixture();
  [dm, player, outsider] = await Promise.all([
    signedIn(USERS.dm),
    signedIn(USERS.player1),
    signedIn(USERS.player2),
  ]);
});

beforeEach(async () => {
  await service.from("party_stats").delete().eq("campaign_id", fx.campaignId);
});

afterAll(teardownRlsFixture);

async function stats(): Promise<Record<string, number>> {
  const { data } = await service
    .from("party_stats")
    .select("stats")
    .eq("campaign_id", fx.campaignId)
    .maybeSingle();
  return (data?.stats as Record<string, number> | undefined) ?? {};
}

const bump = (who: Client, key: string, amount = 1) =>
  who.rpc("increment_party_stat", {
    p_campaign_id: fx.campaignId,
    p_key: key,
    p_amount: amount,
  });

describe("increment_party_stat", () => {
  it("counts a player's roll -- which the old client-side write never did", async () => {
    const { error } = await bump(player, "total_crits");
    expect(error).toBeNull();
    expect(await stats()).toEqual({ total_crits: 1 });
  });

  it("creates the campaign's row on first use, then adds to it", async () => {
    await bump(dm, "total_damage_dealt", 12);
    await bump(player, "total_damage_dealt", 7);
    expect((await stats()).total_damage_dealt).toBe(19);
  });

  it("loses nothing under concurrency", async () => {
    await Promise.all(Array.from({ length: 20 }, () => bump(player, "total_fumbles")));
    expect((await stats()).total_fumbles).toBe(20);
  });

  it("refuses a user outside the campaign", async () => {
    const { error } = await bump(outsider, "total_crits");
    expect(error?.code).toBe("42501");
    expect(await stats()).toEqual({});
  });

  it("refuses keys that are not campaign tallies", async () => {
    const { error } = await bump(player, "void_alignment");
    expect(error?.code).toBe("22023"); // invalid_parameter_value
  });

  it("refuses a negative or absurd amount", async () => {
    expect((await bump(player, "total_crits", -5)).error?.code).toBe("22023");
    expect((await bump(player, "total_crits", 1_000_000)).error?.code).toBe("22023");
  });
});
