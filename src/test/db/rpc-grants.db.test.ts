import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anonClient, service, signedIn, USERS, type Client } from "./clients";
import { setupRlsFixture, teardownRlsFixture, type RlsFixture } from "./fixture";

/**
 * The three SECURITY DEFINER RPCs hardened in
 * 20261021000001_harden_security_definer_rpcs.sql.
 *
 * Postgres grants EXECUTE to PUBLIC by default, and none of these had ever
 * revoked it -- the audit inferred otherwise from migration source and was
 * wrong once already. So these call the functions for real, as each role,
 * which exercises the live grants and the in-body checks together rather than
 * trusting what a migration file appears to say.
 */

const DENIED = "42501"; // insufficient_privilege

let fx: RlsFixture;
let dm: Client;
let member: Client;
let outsider: Client;

beforeAll(async () => {
  fx = await setupRlsFixture();
  [dm, member, outsider] = await Promise.all([
    signedIn(USERS.dm),
    signedIn(USERS.player1),
    signedIn(USERS.player2),
  ]);
});

afterAll(teardownRlsFixture);

describe("an unauthenticated (anon) caller", () => {
  const anon = anonClient();

  it("cannot resolve an email to an account id", async () => {
    const { error } = await anon.rpc("find_user_id_by_email", {
      target_email: USERS.player1.email,
    });
    expect(error?.code).toBe(DENIED);
  });

  it("cannot advance the turn", async () => {
    const { error } = await anon.rpc("advance_encounter_turn", {
      p_encounter_id: fx.encounterId,
    });
    expect(error?.code).toBe(DENIED);
  });

  it("cannot reorder initiative", async () => {
    const { error } = await anon.rpc("reorder_initiative", {
      p_encounter_id: fx.encounterId,
    });
    expect(error?.code).toBe(DENIED);
  });
});

describe("advance_encounter_turn", () => {
  it("refuses a member who is not the DM and does not hold the turn", async () => {
    const { error } = await member.rpc("advance_encounter_turn", {
      p_encounter_id: fx.encounterId,
    });
    expect(error?.code).toBe(DENIED);
  });

  it("lets the DM advance, and resets the new turn holder's action economy", async () => {
    await service
      .from("encounter_participants")
      .update({ action_used: true, bonus_used: true })
      .eq("id", fx.playerParticipantId);

    const { error } = await dm.rpc("advance_encounter_turn", {
      p_encounter_id: fx.encounterId,
    });
    expect(error).toBeNull();

    const { data: enc } = await service
      .from("encounters")
      .select("current_participant_id")
      .eq("id", fx.encounterId)
      .single();
    // No current turn yet, so it starts at initiative_order 1: the player.
    expect(enc?.current_participant_id).toBe(fx.playerParticipantId);

    const { data: p } = await service
      .from("encounter_participants")
      .select("action_used, bonus_used")
      .eq("id", fx.playerParticipantId)
      .single();
    expect(p).toEqual({ action_used: false, bonus_used: false });
  });
});

describe("reorder_initiative", () => {
  // Players call this themselves from InitiativeRollScreen after rolling.
  it("is allowed for a campaign member", async () => {
    const { error } = await member.rpc("reorder_initiative", {
      p_encounter_id: fx.encounterId,
    });
    expect(error).toBeNull();
  });

  it("refuses a signed-in user outside the campaign", async () => {
    const { error } = await outsider.rpc("reorder_initiative", {
      p_encounter_id: fx.encounterId,
    });
    expect(error?.code).toBe(DENIED);
  });
});

describe("find_user_id_by_email", () => {
  // By design this answers null rather than raising: an error would itself
  // confirm the caller hit the access check, and null reveals nothing about
  // whether the address has an account.
  it("tells a plain player nothing", async () => {
    const { data, error } = await member.rpc("find_user_id_by_email", {
      target_email: USERS.player2.email,
    });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("answers a DM", async () => {
    const { data, error } = await dm.rpc("find_user_id_by_email", {
      target_email: USERS.player2.email,
    });
    expect(error).toBeNull();
    expect(data).toBe(USERS.player2.id);
  });
});
