import { admin, must } from "./admin";

/** Ground truth for the campaign's running encounter, read as the service role. */

export async function activeEncounter(campaignId: string) {
  return must(
    await admin()
      .from("encounters")
      .select("id, round, current_participant_id")
      .eq("campaign_id", campaignId)
      .eq("status", "active")
      .single(),
    "active encounter",
  );
}

/** Everyone in the running encounter, in initiative order. */
export async function participants(campaignId: string) {
  const { id } = await activeEncounter(campaignId);
  return must(
    await admin()
      .from("encounter_participants")
      .select(
        "id, name, character_id, initiative_order, initiative_score, hp_current, concentrating_on",
      )
      .eq("encounter_id", id)
      .order("initiative_order"),
    "participants",
  );
}

/** A character's row in the running encounter. */
export async function participantFor(campaignId: string, characterId: string) {
  const row = (await participants(campaignId)).find(
    (p) => p.character_id === characterId,
  );
  if (!row) throw new Error(`no participant for character ${characterId}`);
  return row;
}
