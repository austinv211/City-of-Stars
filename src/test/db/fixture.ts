import { service, USERS } from "./clients";

/**
 * A self-contained campaign for the db suite, separate from the browsable
 * fixture that scripts/seed-fixtures.mjs creates, so tests can mutate freely
 * and the E2E fixture is never disturbed.
 *
 *   dm       DM of the campaign (added by the add_campaign_creator_as_dm trigger)
 *   player1  member, owns `characterId` and the player participant
 *   player2  NOT a member -- the outsider every isolation test reads as
 *
 * Fixed ids make a crashed run self-healing: setup always deletes this
 * campaign first, and every child row cascades from it.
 */
export const RLS_CAMPAIGN_ID = "00000000-0000-4000-9100-000000000001";

export interface RlsFixture {
  campaignId: string;
  characterId: string;
  monsterId: string;
  encounterId: string;
  /** A second, pending encounter in the same campaign -- somewhere to try to move a row to. */
  otherEncounterId: string;
  /** player1's own row in the active encounter. */
  playerParticipantId: string;
  /** A DM-controlled NPC row in the same encounter. */
  npcParticipantId: string;
  diceRollId: string;
}

function must<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error || result.data === null) {
    throw new Error(`fixture: ${what}: ${result.error?.message ?? "no row returned"}`);
  }
  return result.data as NonNullable<T>;
}

export async function teardownRlsFixture(): Promise<void> {
  const { error } = await service.from("campaigns").delete().eq("id", RLS_CAMPAIGN_ID);
  if (error) throw new Error(`fixture teardown: ${error.message}`);
}

export async function setupRlsFixture(): Promise<RlsFixture> {
  await teardownRlsFixture();

  must(
    await service
      .from("campaigns")
      .insert({ id: RLS_CAMPAIGN_ID, name: "RLS suite", created_by: USERS.dm.id })
      .select("id")
      .single(),
    "campaign",
  );
  must(
    await service
      .from("campaign_members")
      .insert({
        campaign_id: RLS_CAMPAIGN_ID,
        user_id: USERS.player1.id,
        role: "player",
      })
      .select("id")
      .single(),
    "player1 membership",
  );

  const character = must(
    await service
      .from("characters")
      .insert({
        campaign_id: RLS_CAMPAIGN_ID,
        owner_id: USERS.player1.id,
        name: "Isolde Testwright",
        class: "Fighter",
        species: "Human",
        background: "Soldier",
        level: 3,
        status: "active",
        hp_max: 28,
        hp_current: 28,
        ac: 16,
      })
      .select("id")
      .single(),
    "character",
  );

  const monster = must(
    await service
      .from("custom_monsters")
      .insert({ campaign_id: RLS_CAMPAIGN_ID, name: "Test Goblin", hp: 7, ac: 15 })
      .select("id")
      .single(),
    "monster",
  );

  const encounter = must(
    await service
      .from("encounters")
      .insert({
        campaign_id: RLS_CAMPAIGN_ID,
        created_by: USERS.dm.id,
        name: "RLS Skirmish",
        status: "active",
      })
      .select("id")
      .single(),
    "encounter",
  );

  const other = must(
    await service
      .from("encounters")
      .insert({
        campaign_id: RLS_CAMPAIGN_ID,
        created_by: USERS.dm.id,
        name: "RLS Next Fight",
        status: "pending",
      })
      .select("id")
      .single(),
    "second encounter",
  );

  const [player, npc] = must(
    await service
      .from("encounter_participants")
      .insert([
        {
          encounter_id: encounter.id,
          character_id: character.id,
          owner_id: USERS.player1.id,
          is_player: true,
          name: "Isolde Testwright",
          hp_current: 28,
          hp_max: 28,
          ac: 16,
          initiative_order: 1,
          initiative_score: 14,
        },
        {
          encounter_id: encounter.id,
          is_player: false,
          name: "Test Goblin",
          hp_current: 7,
          hp_max: 7,
          ac: 15,
          initiative_order: 2,
          initiative_score: 9,
        },
      ])
      .select("id, initiative_order")
      .order("initiative_order"),
    "participants",
  );
  if (!player || !npc) throw new Error("fixture: participants: expected two rows");

  const roll = must(
    await service
      .from("dice_rolls")
      .insert({
        campaign_id: RLS_CAMPAIGN_ID,
        user_id: USERS.player1.id,
        dice_type: "d20",
        roll_type: "Attack",
        result: 12,
        total: 15,
        modifier: 3,
      })
      .select("id")
      .single(),
    "dice roll",
  );

  return {
    campaignId: RLS_CAMPAIGN_ID,
    characterId: character.id,
    monsterId: monster.id,
    encounterId: encounter.id,
    otherEncounterId: other.id,
    playerParticipantId: player.id,
    npcParticipantId: npc.id,
    diceRollId: roll.id,
  };
}
