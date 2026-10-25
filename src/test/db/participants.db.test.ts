import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { service, signedIn, USERS, type Client } from "./clients";
import { setupRlsFixture, teardownRlsFixture, type RlsFixture } from "./fixture";
import type { Database } from "@/types/database";

type ParticipantUpdate =
  Database["public"]["Tables"]["encounter_participants"]["Update"];

/**
 * encounter_participants: who may change which column of a combatant.
 *
 * The owner UPDATE policy is `owner_id = auth.uid()` with no column list, so
 * until 20261025000001 a player could rewrite ANY column of their own row --
 * move it into another encounter, raise their own hp_max and AC, grant
 * themselves damage immunities, or jump the initiative order.
 *
 * What a player legitimately writes is narrower but real, and must keep
 * working: damage, healing, death saves, conditions, concentration, cover,
 * inspiration, the per-turn action flags, and their own initiative roll.
 */

let fx: RlsFixture;
let dm: Client;
let player: Client;

beforeEach(async () => {
  fx = await setupRlsFixture();
});

beforeAll(async () => {
  [dm, player] = await Promise.all([signedIn(USERS.dm), signedIn(USERS.player1)]);
});

afterAll(teardownRlsFixture);

async function readParticipant(id: string) {
  const { data, error } = await service
    .from("encounter_participants")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

describe("a player editing their own participant", () => {
  // Each of these is either structural (which encounter, which character, turn
  // order) or a stat the character sheet owns and the sync trigger mirrors.
  const pinned: [string, () => ParticipantUpdate][] = [
    ["encounter_id", () => ({ encounter_id: fx.otherEncounterId })],
    ["character_id", () => ({ character_id: null })],
    ["is_player", () => ({ is_player: false })],
    ["initiative_order", () => ({ initiative_order: 0 })],
    ["hp_max", () => ({ hp_max: 999 })],
    ["ac", () => ({ ac: 30 })],
    ["damage_immunities", () => ({ damage_immunities: ["slashing"] })],
    ["name", () => ({ name: "Someone Else" })],
  ];

  it.fails.each(pinned)("cannot change %s", async (_column, change) => {
    const before = await readParticipant(fx.playerParticipantId);
    const { error } = await player
      .from("encounter_participants")
      .update(change())
      .eq("id", fx.playerParticipantId);
    expect(error?.code).toBe("42501");
    expect(await readParticipant(fx.playerParticipantId)).toEqual(before);
  });

  it("can apply the gameplay changes the encounter screen makes", async () => {
    const change: ParticipantUpdate = {
      hp_current: 10,
      hp_temp: 5,
      death_save_successes: 1,
      death_save_failures: 2,
      conditions: ["prone"],
      concentrating_on: "Bless",
      cover: "half",
      heroic_inspiration: true,
      action_used: true,
      bonus_used: true,
      reaction_used: true,
      dodging: true,
      initiative_score: 18,
      has_rolled_initiative: true,
    };
    const { error } = await player
      .from("encounter_participants")
      .update(change)
      .eq("id", fx.playerParticipantId);
    expect(error).toBeNull();
    expect(await readParticipant(fx.playerParticipantId)).toMatchObject(change);
  });

  it("still cannot touch another combatant's row at all", async () => {
    await player
      .from("encounter_participants")
      .update({ hp_current: 0 })
      .eq("id", fx.npcParticipantId);
    expect((await readParticipant(fx.npcParticipantId)).hp_current).toBe(7);
  });
});

describe("the DM", () => {
  it("can change any column, including the ones pinned for players", async () => {
    const { error } = await dm
      .from("encounter_participants")
      .update({ hp_max: 40, ac: 18, initiative_order: 5, name: "Isolde the Bold" })
      .eq("id", fx.playerParticipantId);
    expect(error).toBeNull();
    expect(await readParticipant(fx.playerParticipantId)).toMatchObject({
      hp_max: 40,
      ac: 18,
      initiative_order: 5,
      name: "Isolde the Bold",
    });
  });
});

// The pinned columns still change -- through these definer paths, which run
// as the function owner rather than as the player. Guarding them here is what
// stops a column pin from quietly breaking them.
describe("server-side paths that write pinned columns", () => {
  it("sync_character_to_participants mirrors a player's own sheet edit", async () => {
    const { error } = await player
      .from("characters")
      .update({ ac: 17, hp_max: 31, exhaustion: 1, damage_resistances: ["fire"] })
      .eq("id", fx.characterId);
    expect(error).toBeNull();
    expect(await readParticipant(fx.playerParticipantId)).toMatchObject({
      ac: 17,
      hp_max: 31,
      exhaustion: 1,
      damage_resistances: ["fire"],
    });
  });

  it("reorder_initiative, called by a player, rewrites initiative_order", async () => {
    await player
      .from("encounter_participants")
      .update({ initiative_score: 1 })
      .eq("id", fx.playerParticipantId);
    const { error } = await player.rpc("reorder_initiative", {
      p_encounter_id: fx.encounterId,
    });
    expect(error).toBeNull();
    // Goblin rolled 9, player now 1: the player drops to second.
    expect((await readParticipant(fx.playerParticipantId)).initiative_order).toBe(2);
    expect((await readParticipant(fx.npcParticipantId)).initiative_order).toBe(1);
  });
});

describe("encounter triggers", () => {
  it("advance the turn when the current turn holder is removed", async () => {
    await service
      .from("encounters")
      .update({ current_participant_id: fx.playerParticipantId })
      .eq("id", fx.encounterId);
    const { error } = await dm
      .from("encounter_participants")
      .delete()
      .eq("id", fx.playerParticipantId);
    expect(error).toBeNull();
    const { data } = await service
      .from("encounters")
      .select("current_participant_id")
      .eq("id", fx.encounterId)
      .single();
    expect(data?.current_participant_id).toBe(fx.npcParticipantId);
  });
});

describe("campaign_members", () => {
  it("rejects a second DM in one campaign (one_dm_per_campaign)", async () => {
    const { error } = await service
      .from("campaign_members")
      .update({ role: "dm" })
      .eq("campaign_id", fx.campaignId)
      .eq("user_id", USERS.player1.id);
    expect(error?.code).toBe("23505"); // unique_violation
  });
});
