import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { service, signedIn, USERS, type Client } from "./clients";
import { setupRlsFixture, teardownRlsFixture, type RlsFixture } from "./fixture";
import type { Database } from "@/types/database";

type EffectInsert = Database["public"]["Tables"]["encounter_effects"]["Insert"];

/**
 * §3.3: rounds, tracked effects, the event log and legendary actions, all
 * driven by advance_encounter_turn.
 *
 * The fixture's initiative order is player (1) then goblin (2), with no
 * current turn, so the first advance starts round 1 on the player.
 */

let fx: RlsFixture;
let dm: Client;
let player: Client;
let outsider: Client;

beforeAll(async () => {
  [dm, player, outsider] = await Promise.all([
    signedIn(USERS.dm),
    signedIn(USERS.player1),
    signedIn(USERS.player2),
  ]);
});

beforeEach(async () => {
  fx = await setupRlsFixture();
});

afterAll(teardownRlsFixture);

async function advance() {
  const { error } = await dm.rpc("advance_encounter_turn", {
    p_encounter_id: fx.encounterId,
  });
  if (error) throw new Error(`advance: ${error.message}`);
}

async function encounterState() {
  const { data } = await service
    .from("encounters")
    .select("round, turn_seq, current_participant_id")
    .eq("id", fx.encounterId)
    .single();
  return data;
}

async function effectNames() {
  const { data } = await service
    .from("encounter_effects")
    .select("name")
    .eq("encounter_id", fx.encounterId)
    .order("name");
  return (data ?? []).map((e) => e.name);
}

function effect(fields: Omit<EffectInsert, "encounter_id">): EffectInsert {
  return { encounter_id: fx.encounterId, ...fields };
}

describe("rounds", () => {
  it("start at 1 and increment exactly once per wrap", async () => {
    await advance(); // player, round 1 begins -- not a wrap
    expect(await encounterState()).toMatchObject({
      round: 1,
      turn_seq: 1,
      current_participant_id: fx.playerParticipantId,
    });
    await advance(); // goblin
    expect((await encounterState())?.round).toBe(1);
    await advance(); // back to the top
    expect(await encounterState()).toMatchObject({
      round: 2,
      turn_seq: 3,
      current_participant_id: fx.playerParticipantId,
    });
  });
});

describe("legendary actions", () => {
  it("refill at the start of the creature's own turn", async () => {
    await service
      .from("encounter_participants")
      .update({ legendary_actions_max: 3, legendary_actions_remaining: 0 })
      .eq("id", fx.npcParticipantId);
    await advance(); // player
    await advance(); // goblin
    const { data } = await service
      .from("encounter_participants")
      .select("legendary_actions_remaining")
      .eq("id", fx.npcParticipantId)
      .single();
    expect(data?.legendary_actions_remaining).toBe(3);
  });
});

describe("effect expiry", () => {
  it("end_of_target_next_turn: an unacted target's turn THIS round counts", async () => {
    await advance(); // player's turn, seq 1
    await dm.from("encounter_effects").insert(
      effect({
        name: "Vexed",
        target_participant_id: fx.npcParticipantId,
        expiry: "end_of_target_next_turn",
      }),
    );
    await advance(); // goblin's turn begins -- still on
    expect(await effectNames()).toEqual(["Vexed"]);
    await advance(); // goblin's turn ends, still round 1 -- gone
    expect(await effectNames()).toEqual([]);
  });

  it("end_of_source_next_turn: the turn it was cast on does not count", async () => {
    await advance(); // player's turn
    await player.from("encounter_effects").insert(
      effect({
        name: "Mocked",
        source_participant_id: fx.playerParticipantId,
        target_participant_id: fx.npcParticipantId,
        expiry: "end_of_source_next_turn",
      }),
    );
    await advance(); // end of the casting turn: kept
    await advance(); // the player's NEXT turn begins: kept
    expect(await effectNames()).toEqual(["Mocked"]);
    await advance(); // ...and ends: gone
    expect(await effectNames()).toEqual([]);
  });

  it("start_of_source_next_turn ends as the source's next turn begins", async () => {
    await advance();
    await player.from("encounter_effects").insert(
      effect({
        name: "Guarded",
        source_participant_id: fx.playerParticipantId,
        target_participant_id: fx.playerParticipantId,
        expiry: "start_of_source_next_turn",
      }),
    );
    await advance(); // goblin
    expect(await effectNames()).toEqual(["Guarded"]);
    await advance(); // player again
    expect(await effectNames()).toEqual([]);
  });

  it("rounds: counts down on each of the source's turns, then expires", async () => {
    await advance();
    await player.from("encounter_effects").insert(
      effect({
        name: "Bless",
        source_participant_id: fx.playerParticipantId,
        target_participant_id: fx.playerParticipantId,
        expiry: "rounds",
        rounds_remaining: 2,
      }),
    );
    await advance();
    await advance(); // player's turn: 2 -> 1
    expect(await effectNames()).toEqual(["Bless"]);
    await advance();
    await advance(); // player's turn: 1 -> 0, removed
    expect(await effectNames()).toEqual([]);
  });

  it("concentration: ends the moment the source stops concentrating", async () => {
    await player
      .from("encounter_participants")
      .update({ concentrating_on: "Bless" })
      .eq("id", fx.playerParticipantId);
    await player.from("encounter_effects").insert(
      effect({
        name: "Bless",
        source_participant_id: fx.playerParticipantId,
        target_participant_id: fx.playerParticipantId,
        expiry: "concentration",
      }),
    );
    expect(await effectNames()).toEqual(["Bless"]);
    await player
      .from("encounter_participants")
      .update({ concentrating_on: null })
      .eq("id", fx.playerParticipantId);
    expect(await effectNames()).toEqual([]);
  });

  it("manual: survives any number of turns", async () => {
    await dm
      .from("encounter_effects")
      .insert(
        effect({
          name: "Cursed",
          target_participant_id: fx.npcParticipantId,
          expiry: "manual",
        }),
      );
    for (let i = 0; i < 4; i++) await advance();
    expect(await effectNames()).toEqual(["Cursed"]);
  });
});

describe("encounter_effects access", () => {
  it("a player may place an effect they are the source of", async () => {
    const { error } = await player.from("encounter_effects").insert(
      effect({
        name: "Hunter's Mark",
        source_participant_id: fx.playerParticipantId,
        target_participant_id: fx.npcParticipantId,
        expiry: "manual",
      }),
    );
    expect(error).toBeNull();
  });

  it("a player may not place one in someone else's name", async () => {
    const { error } = await player.from("encounter_effects").insert(
      effect({
        name: "Forged",
        source_participant_id: fx.npcParticipantId,
        target_participant_id: fx.playerParticipantId,
        expiry: "manual",
      }),
    );
    expect(error?.code).toBe("42501");
  });

  it("a player cannot remove the DM's effect on them", async () => {
    await dm
      .from("encounter_effects")
      .insert(
        effect({
          name: "Restrained",
          target_participant_id: fx.playerParticipantId,
          expiry: "manual",
        }),
      );
    await player.from("encounter_effects").delete().eq("encounter_id", fx.encounterId);
    expect(await effectNames()).toEqual(["Restrained"]);
  });

  it("the creation point is stamped by the server, not taken from the client", async () => {
    await advance();
    await advance(); // turn_seq 2
    await dm.from("encounter_effects").insert(
      effect({
        name: "Backdated",
        target_participant_id: fx.npcParticipantId,
        expiry: "manual",
        created_turn_seq: -100,
        created_round: 99,
      }),
    );
    const { data } = await service
      .from("encounter_effects")
      .select("created_turn_seq, created_round")
      .eq("encounter_id", fx.encounterId)
      .single();
    expect(data).toEqual({ created_turn_seq: 2, created_round: 1 });
  });

  it("an effect cannot target a combatant from another encounter", async () => {
    const { error } = await dm.from("encounter_effects").insert({
      encounter_id: fx.otherEncounterId,
      name: "Misfiled",
      target_participant_id: fx.npcParticipantId,
      expiry: "manual",
    });
    expect(error?.code).toBe("23503"); // foreign_key_violation
  });

  it("is invisible outside the campaign", async () => {
    await dm
      .from("encounter_effects")
      .insert(
        effect({
          name: "Secret",
          target_participant_id: fx.npcParticipantId,
          expiry: "manual",
        }),
      );
    const { data } = await outsider
      .from("encounter_effects")
      .select("id")
      .eq("encounter_id", fx.encounterId);
    expect(data).toEqual([]);
  });
});

describe("encounter_events", () => {
  async function events() {
    const { data } = await service
      .from("encounter_events")
      .select("kind, actor_id, participant_id, payload, round")
      .eq("encounter_id", fx.encounterId)
      .order("id");
    return data ?? [];
  }

  it("logs a player's damage with before/after and the real actor", async () => {
    await player
      .from("encounter_participants")
      .update({ hp_current: 20 })
      .eq("id", fx.playerParticipantId);
    expect(await events()).toEqual([
      {
        kind: "damage",
        actor_id: USERS.player1.id,
        participant_id: fx.playerParticipantId,
        round: 1,
        payload: {
          name: "Isolde Testwright",
          before: { hp_current: 28 },
          after: { hp_current: 20 },
        },
      },
    ]);
  });

  it("logs turns, and effects added and expired", async () => {
    await advance();
    await dm.from("encounter_effects").insert(
      effect({
        name: "Vexed",
        target_participant_id: fx.npcParticipantId,
        expiry: "end_of_target_next_turn",
      }),
    );
    await advance();
    await advance();
    expect((await events()).map((e) => e.kind)).toEqual([
      "turn",
      "effect_added",
      "turn",
      "effect_removed",
      "turn",
    ]);
  });

  it("does not log churn that is not history (turn-economy flags)", async () => {
    await player
      .from("encounter_participants")
      .update({ action_used: true, dodging: true })
      .eq("id", fx.playerParticipantId);
    expect(await events()).toEqual([]);
  });

  it("does not log outside an active encounter", async () => {
    await service
      .from("encounters")
      .update({ status: "pending" })
      .eq("id", fx.encounterId);
    await dm
      .from("encounter_participants")
      .update({ hp_current: 1 })
      .eq("id", fx.npcParticipantId);
    expect(await events()).toEqual([]);
  });

  describe("is append-only for every client role", () => {
    beforeEach(async () => {
      await player
        .from("encounter_participants")
        .update({ hp_current: 20 })
        .eq("id", fx.playerParticipantId);
    });

    it("a player cannot write an event", async () => {
      const { error } = await player.from("encounter_events").insert({
        encounter_id: fx.encounterId,
        kind: "heal",
        payload: {},
      });
      expect(error?.code).toBe("42501");
    });

    it("the DM cannot rewrite one", async () => {
      const { error } = await dm
        .from("encounter_events")
        .update({ kind: "heal" })
        .eq("encounter_id", fx.encounterId);
      expect(error?.code).toBe("42501");
    });

    it("the DM cannot delete one", async () => {
      const { error } = await dm
        .from("encounter_events")
        .delete()
        .eq("encounter_id", fx.encounterId);
      expect(error?.code).toBe("42501");
      expect(await events()).toHaveLength(1);
    });

    it("members can read it; outsiders cannot", async () => {
      const [mine, theirs] = await Promise.all([
        player.from("encounter_events").select("id").eq("encounter_id", fx.encounterId),
        outsider
          .from("encounter_events")
          .select("id")
          .eq("encounter_id", fx.encounterId),
      ]);
      expect(mine.data).toHaveLength(1);
      expect(theirs.data).toEqual([]);
    });
  });
});
