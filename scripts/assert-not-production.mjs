#!/usr/bin/env node
/**
 * Production-safety guard.
 *
 * Every script or test run that may WRITE to a database must call this first.
 * It is an allowlist, not a denylist: a target is refused unless it can be
 * positively shown to be a local or explicitly-declared ephemeral stack.
 *
 * Four independent checks (see the plan's §2.1):
 *   1. host must be loopback, OR an ephemeral target must be explicitly declared
 *   2. the target must not be the project ref found in .env (the real project)
 *   3. the service-role key must not be the production one
 *   4. the database must carry the `_cos_test_marker` table (async, opt-in)
 *
 * Usage:
 *   node --env-file=.env.e2e scripts/assert-not-production.mjs
 *   import { assertNotProduction, assertTestMarker } from './assert-not-production.mjs'
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1", "[::1]", "0.0.0.0"]);

class ProductionTargetError extends Error {
  constructor(msg) {
    super(
      `\n\x1b[41m\x1b[97m REFUSING TO RUN \x1b[0m\n\n  ${msg}\n\n` +
        `  This guard exists so a test run can never touch production data.\n` +
        `  If you genuinely need a non-local target, declare it explicitly with\n` +
        `  COS_TEST_TARGET=ephemeral and COS_BRANCH_REF=<preview-branch-ref>.\n`,
    );
    this.name = "ProductionTargetError";
  }
}

/** Minimal dotenv reader — no dependency, no interpolation, never logs values. */
function readEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    out[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
  }
  return out;
}

/** Supabase project ref is the first label of <ref>.supabase.co */
function projectRef(url) {
  try {
    const { hostname } = new URL(url);
    const m = hostname.match(/^([a-z0-9]{20})\./i);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function assertNotProduction(env = process.env) {
  const target = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  if (!target) {
    throw new ProductionTargetError(
      "No target URL set. Expected SUPABASE_URL or VITE_SUPABASE_URL (load .env.e2e).",
    );
  }

  let host;
  try {
    host = new URL(target).hostname;
  } catch {
    throw new ProductionTargetError(`Target is not a valid URL: ${target}`);
  }

  const ephemeral = env.COS_TEST_TARGET === "ephemeral";
  const targetRef = projectRef(target);

  // ── check 1: loopback, or an explicitly declared ephemeral branch ──────────
  if (!LOOPBACK.has(host)) {
    if (!ephemeral) {
      throw new ProductionTargetError(
        `Target host "${host}" is not loopback and COS_TEST_TARGET is not "ephemeral".`,
      );
    }
    if (!env.COS_BRANCH_REF) {
      throw new ProductionTargetError(
        `COS_TEST_TARGET=ephemeral requires COS_BRANCH_REF to name the preview branch.`,
      );
    }
    if (targetRef && targetRef !== env.COS_BRANCH_REF.toLowerCase()) {
      throw new ProductionTargetError(
        `Target ref "${targetRef}" does not match COS_BRANCH_REF "${env.COS_BRANCH_REF}".`,
      );
    }
  }

  // ── check 2: must never equal the ref configured in .env ───────────────────
  const prod = readEnvFile(path.join(ROOT, ".env"));
  const prodRef = projectRef(prod.VITE_SUPABASE_URL ?? "");
  if (prodRef && targetRef && prodRef === targetRef) {
    throw new ProductionTargetError(
      `Target project ref matches the one in .env — that is the real project.`,
    );
  }

  // ── check 3: never carry the production service-role key ──────────────────
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (key && prod.SUPABASE_SERVICE_ROLE_KEY && key === prod.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ProductionTargetError(
      `SUPABASE_SERVICE_ROLE_KEY is identical to the one in .env (production).`,
    );
  }

  return { target, host, ephemeral, ref: targetRef ?? "(local)" };
}

/**
 * Check 4 — ask the database itself whether it is a test database.
 * Requires the 00-marker.sql seed, which only ever runs on `db reset`.
 */
export async function assertTestMarker(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  const res = await fetch(`${url}/rest/v1/_cos_test_marker?select=seeded_at&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new ProductionTargetError(
      `_cos_test_marker is not readable (HTTP ${res.status}). ` +
        `This database was not created by \`supabase db reset\`, so it is not a test database.`,
    );
  }
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ProductionTargetError(`_cos_test_marker exists but is empty — refusing.`);
  }
  return rows[0];
}

// ── CLI ─────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const info = assertNotProduction();
    console.log(
      `\x1b[32m✔\x1b[0m safe target: ${info.host} ` +
        `(${info.ephemeral ? `ephemeral ${info.ref}` : "local stack"})`,
    );
    if (process.argv.includes("--check-marker")) {
      const row = await assertTestMarker();
      console.log(`\x1b[32m✔\x1b[0m _cos_test_marker present (seeded ${row.seeded_at})`);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
