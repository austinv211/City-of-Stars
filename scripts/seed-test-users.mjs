#!/usr/bin/env node
/**
 * Create the deterministic mock users the test suites log in as.
 *
 * Users are CREATED through the auth admin API, never copied from production —
 * no real email, password hash or user id is ever reproduced locally. The
 * sanitised snapshot (scripts/snapshot-sanitize.mjs) remaps every owner/user FK
 * onto the fixed ids below, which is what lets real-shaped campaign content sit
 * alongside entirely synthetic accounts.
 *
 * Refuses to run against anything that is not a verified test database: it
 * calls assertNotProduction() and then assertTestMarker(), so both the
 * environment and the database itself have to agree.
 *
 * Usage:
 *   node --env-file=.env.e2e scripts/seed-test-users.mjs
 */

import {
  assertNotProduction,
  assertTestMarker,
} from "./assert-not-production.mjs";

/** Fixed uuids so snapshot remapping and test assertions are reproducible. */
export const TEST_USERS = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "dm@test.local",
    password: "test-password-dm",
    appRole: "dm",
    campaignRole: "dm",
    displayName: "Test DM",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "player1@test.local",
    password: "test-password-p1",
    appRole: "player",
    campaignRole: "player",
    displayName: "Test Player One",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    email: "player2@test.local",
    password: "test-password-p2",
    appRole: "player",
    campaignRole: "player",
    displayName: "Test Player Two",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    email: "player3@test.local",
    password: "test-password-p3",
    appRole: "player",
    campaignRole: "player",
    displayName: "Test Player Three",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    email: "admin@test.local",
    password: "test-password-admin",
    appRole: "admin",
    campaignRole: null,
    displayName: "Test Admin",
  },
];

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function admin(path, init = {}) {
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function upsertUser(u) {
  // Idempotent: delete first so repeated runs converge instead of 422-ing on
  // a duplicate email.
  await admin(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });

  const res = await admin("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      id: u.id,
      email: u.email,
      password: u.password,
      email_confirm: true, // no inbox round-trip in tests
      user_metadata: { display_name: u.displayName },
    }),
  });
  if (!res.ok) {
    throw new Error(`create ${u.email} failed: ${res.status} ${await res.text()}`);
  }
  return u;
}

/** The app gates on allowed_emails + user_roles, so exercise the real tables. */
async function grantAppRole(u) {
  for (const [table, row] of [
    ["allowed_emails", { email: u.email, app_role: u.appRole }],
    ["user_roles", { user_id: u.id, app_role: u.appRole }],
  ]) {
    const res = await admin(`/rest/v1/${table}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(row),
    });
    if (!res.ok && res.status !== 409) {
      throw new Error(`${table} for ${u.email}: ${res.status} ${await res.text()}`);
    }
  }
}

async function main() {
  const info = assertNotProduction();
  console.log(`target: ${info.host} (${info.ref})`);
  const marker = await assertTestMarker();
  console.log(`marker: seeded ${marker.seeded_at}`);

  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

  for (const u of TEST_USERS) {
    await upsertUser(u);
    await grantAppRole(u);
    console.log(`  ✔ ${u.email.padEnd(20)} ${u.appRole}`);
  }
  console.log(`\n${TEST_USERS.length} test users ready.`);
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
