#!/usr/bin/env node
/**
 * Minimal synthetic campaign fixture for the local stack.
 *
 * Enough shape to exercise the UI without any production data: one campaign,
 * the DM plus three players as members, and a character per player.
 *
 * This is also what makes the shell look like itself — `isDM` is derived from
 * a `campaign_members` row, not from an app role, so a freshly reset database
 * renders an empty nav until this runs.
 *
 * Runs after seed-test-users.mjs (it references those fixed user ids) and
 * through the REST API rather than as SQL, because the users it links to are
 * created through the auth admin API and so do not exist when `db reset` runs
 * its .sql seeds.
 *
 * Usage:
 *   node --env-file=.env.e2e scripts/seed-fixtures.mjs
 */

import { assertNotProduction, assertTestMarker } from "./assert-not-production.mjs";
import { TEST_USERS } from "./seed-test-users.mjs";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CAMPAIGN_ID = "00000000-0000-4000-9000-000000000001";

const dm = TEST_USERS.find((u) => u.campaignRole === "dm");
const players = TEST_USERS.filter((u) => u.campaignRole === "player");

// Column names taken from src/frontend/types/database.ts -- the character
// class column is `class`, not `class_name`, and `background` is NOT NULL.
const CHARACTERS = [
  { name: "Lyra Dawnwhisper", class: "Cleric", species: "Human", background: "Acolyte", level: 5 },
  { name: "Thorne Ironhollow", class: "Fighter", species: "Dwarf", background: "Soldier", level: 5 },
  { name: "Sable Quickfoot", class: "Rogue", species: "Halfling", background: "Criminal", level: 4 },
];

async function rest(path, { method = "POST", body, prefer } = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: prefer ?? "resolution=merge-duplicates,return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function main() {
  const info = assertNotProduction();
  console.log(`target: ${info.host} (${info.ref})`);
  await assertTestMarker();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  if (!dm) throw new Error("no DM in TEST_USERS");

  // Idempotent: drop the campaign first and let ON DELETE CASCADE clear the
  // members and characters hanging off it.
  await rest(`campaigns?id=eq.${CAMPAIGN_ID}`, { method: "DELETE", prefer: "return=minimal" });

  await rest("campaigns", {
    body: {
      id: CAMPAIGN_ID,
      name: "The Shattered Vault",
      created_by: dm.id,
      current_session: 3,
    },
  });
  console.log("  ✔ campaign: The Shattered Vault");

  // The add_campaign_creator_as_dm trigger already inserted the DM row, and
  // the one_dm_per_campaign partial unique index rejects a second one -- so
  // only the players go in here.
  await rest("campaign_members", {
    body: players.map((p) => ({
      campaign_id: CAMPAIGN_ID,
      user_id: p.id,
      role: "player",
    })),
  });
  console.log(`  ✔ members: dm (via trigger) + ${players.length} players`);

  for (const [i, p] of players.entries()) {
    const c = CHARACTERS[i % CHARACTERS.length];
    const [row] = await rest("characters", {
      body: {
        campaign_id: CAMPAIGN_ID,
        owner_id: p.id,
        name: c.name,
        class: c.class,
        species: c.species,
        background: c.background,
        level: c.level,
        status: "active",
      },
    });
    await rest("ability_scores", {
      body: {
        character_id: row.id,
        strength: 14,
        dexterity: 15,
        constitution: 13,
        intelligence: 12,
        wisdom: 16,
        charisma: 10,
        method: "standard_array",
      },
    });
    console.log(`  ✔ character: ${c.name} (${p.email})`);
  }

  // ── A monster and an encounter template ─────────────────────────────────
  // Gives the encounter list and its three tables real rows to render, and
  // gives Phase 3's redesign something to run against.
  const [goblin] = await rest("custom_monsters", {
    body: {
      campaign_id: CAMPAIGN_ID,
      name: "Vault Goblin",
      hp: 7,
      ac: 15,
      default_initiative: 2,
      cr: "1/4",
      xp: 50,
      dex_score: 14,
      actions: [
        { name: "Scimitar", desc: "Melee Weapon Attack: +4 to hit, 5 ft. Hit: 5 (1d6+2) slashing." },
      ],
    },
  });

  const [template] = await rest("encounters", {
    body: {
      campaign_id: CAMPAIGN_ID,
      created_by: dm.id,
      name: "Vault Ambush",
      status: "pending",
      is_template: true,
    },
  });

  await rest("encounter_participants", {
    body: [1, 2, 3].map((n) => ({
      encounter_id: template.id,
      name: `${goblin.name} ${String(n)}`,
      hp_current: goblin.hp,
      hp_max: goblin.hp,
      ac: goblin.ac,
      initiative_order: n,
      initiative_score: goblin.default_initiative,
      is_player: false,
      dex_score: goblin.dex_score,
      actions: goblin.actions,
    })),
  });
  console.log("  ✔ template: Vault Ambush (3 goblins)");
  console.log("\nFixture ready.");
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
