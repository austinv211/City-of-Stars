import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { service, signedIn, USERS, type Client } from "./clients";
import { setupRlsFixture, teardownRlsFixture, type RlsFixture } from "./fixture";

/**
 * dice_rolls is the campaign's roll log. It is only trustworthy if it is
 * append-only and nobody can roll in someone else's name: there is an INSERT
 * policy pinned to auth.uid() and deliberately no UPDATE or DELETE policy.
 */

let fx: RlsFixture;
let player: Client;

beforeAll(async () => {
  fx = await setupRlsFixture();
  player = await signedIn(USERS.player1);
});

afterAll(teardownRlsFixture);

const roll = (userId: string) => ({
  campaign_id: fx.campaignId,
  user_id: userId,
  dice_type: "d20",
  roll_type: "Check",
  result: 10,
  total: 10,
});

describe("dice_rolls", () => {
  it("accepts a roll the player makes as themselves", async () => {
    const { error } = await player.from("dice_rolls").insert(roll(USERS.player1.id));
    expect(error).toBeNull();
  });

  it("rejects a roll recorded in another user's name", async () => {
    const { error } = await player.from("dice_rolls").insert(roll(USERS.dm.id));
    expect(error?.code).toBe("42501");
  });

  // RLS with no matching policy filters the target rows out, so the request
  // "succeeds" having touched nothing. The proof is the row, re-read with the
  // service role.
  it("cannot be edited after the fact, even by its author", async () => {
    await player.from("dice_rolls").update({ total: 20 }).eq("id", fx.diceRollId);
    const { data } = await service
      .from("dice_rolls")
      .select("total")
      .eq("id", fx.diceRollId)
      .single();
    expect(data?.total).toBe(15);
  });

  it("cannot be deleted, even by its author", async () => {
    await player.from("dice_rolls").delete().eq("id", fx.diceRollId);
    const { data } = await service
      .from("dice_rolls")
      .select("id")
      .eq("id", fx.diceRollId);
    expect(data).toHaveLength(1);
  });
});
