import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import {
  assertNotProduction,
  assertTestMarker,
} from "../../../scripts/assert-not-production.mjs";

/**
 * Runs once, before any db test file is loaded. Every file in this project
 * writes to the database it is pointed at, so it must be provably the local
 * test stack: loopback host, not the real project ref, not the production
 * service key, and carrying the _cos_test_marker table.
 *
 * Asserts against .env.e2e directly rather than process.env, which in this
 * process still holds whatever the developer's shell had in it.
 */
export default async function setup() {
  const env = parseEnv(readFileSync(".env.e2e", "utf8"));
  assertNotProduction(env);
  await assertTestMarker(env);
}
