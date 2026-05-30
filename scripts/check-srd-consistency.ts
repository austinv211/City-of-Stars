#!/usr/bin/env node
/**
 * SRD consistency guard.
 *
 * Diffs the hard-coded character-rules constants against the parsed SRD tables in
 * Supabase and exits non-zero on any mismatch. This prevents the constants
 * (dnd2024.constants.ts, data/spellSlots.ts, data/leveling.ts) from silently
 * drifting away from the ruleset the rest of the app is meant to follow.
 *
 * Setup:
 *   1. VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env
 *   2. Run: npm run check:srd   (or: npx tsx scripts/check-srd-consistency.ts)
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { CLASSES, SKILLS } from "../src/frontend/features/characters/data/dnd2024.constants";
import { slotsForClass } from "../src/frontend/features/characters/data/spellSlots";
import { getAsiLevels } from "../src/frontend/features/characters/data/leveling";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Load .env manually (mirrors scripts/parse-srd.mjs) ──────────────────────
const env: Record<string, string> = {};
try {
  readFileSync(join(root, ".env"), "utf-8").split("\n").forEach((line) => {
    const [k, ...rest] = line.split("=");
    if (k && !k.startsWith("#")) env[k.trim()] = rest.join("=").trim();
  });
} catch {
  console.error("Could not read .env file");
}

const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("ERROR: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Helpers ──────────────────────────────────────────────────────────────────
const ALL_SKILLS = SKILLS.map((s) => s.name);

const problems: string[] = [];
function fail(msg: string) {
  problems.push(msg);
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

function sortNums(a: number[]): number[] {
  return [...a].sort((x, y) => x - y);
}

// Normalize a srd_classes.skill_choices array into a clean set of skill names.
// Handles parse artifacts: a leading "or " on the last entry, and the
// "Choose any N skills…" sentinel (means any skill).
function parseSrdSkillChoices(raw: string[]): string[] {
  if (raw.some((s) => /choose any \d+ skills/i.test(s))) return [...ALL_SKILLS];
  return raw.map((s) => s.replace(/^or\s+/i, "").trim());
}

interface SrdClassRow {
  name: string;
  hit_die: number;
  saving_throws: string[];
  skill_choices: string[];
  spellcasting_ability: string | null;
  spell_slots_by_level: number[][] | null;
}

async function main() {
  const { data: srdClassesRaw, error: classErr } = await supabase
    .from("srd_classes")
    .select("name, hit_die, saving_throws, skill_choices, spellcasting_ability, spell_slots_by_level");
  if (classErr) {
    console.error("Failed to query srd_classes:", classErr.message);
    process.exit(1);
  }
  const srdClasses = new Map<string, SrdClassRow>();
  for (const row of (srdClassesRaw ?? []) as SrdClassRow[]) {
    srdClasses.set(row.name.toLowerCase(), row);
  }

  // ASI levels from srd_class_features
  const { data: asiRows, error: asiErr } = await supabase
    .from("srd_class_features")
    .select("class_name, level")
    .ilike("feature_name", "%ability score improvement%");
  if (asiErr) {
    console.error("Failed to query srd_class_features:", asiErr.message);
    process.exit(1);
  }
  const srdAsi = new Map<string, number[]>();
  for (const r of (asiRows ?? []) as { class_name: string; level: number }[]) {
    const key = r.class_name.toLowerCase();
    srdAsi.set(key, [...(srdAsi.get(key) ?? []), r.level]);
  }

  for (const cls of CLASSES) {
    const key = cls.name.toLowerCase();
    const srd = srdClasses.get(key);
    if (!srd) {
      fail(`${cls.name}: no matching row in srd_classes`);
      continue;
    }

    // Hit die
    if (cls.hitDie !== srd.hit_die) {
      fail(`${cls.name}: hitDie ${cls.hitDie} != srd hit_die ${srd.hit_die}`);
    }

    // Saving throws (order-insensitive)
    if (!sameSet(cls.savingThrows as string[], srd.saving_throws ?? [])) {
      fail(`${cls.name}: savingThrows [${cls.savingThrows}] != srd [${srd.saving_throws}]`);
    }

    // Spellcasting ability (case-insensitive; both null for non-casters)
    const codeAbility = cls.spellcastingAbility ? cls.spellcastingAbility.toLowerCase() : null;
    const srdAbility = srd.spellcasting_ability ? srd.spellcasting_ability.toLowerCase() : null;
    if (codeAbility !== srdAbility) {
      fail(`${cls.name}: spellcastingAbility ${codeAbility} != srd ${srdAbility}`);
    }

    // Skill choices (set comparison)
    const srdSkills = parseSrdSkillChoices(srd.skill_choices ?? []);
    if (!sameSet(cls.skillChoices, srdSkills)) {
      const missing = srdSkills.filter((s) => !cls.skillChoices.includes(s));
      const extra = cls.skillChoices.filter((s) => !srdSkills.includes(s));
      fail(
        `${cls.name}: skillChoices differ from srd` +
          (missing.length ? ` — missing ${JSON.stringify(missing)}` : "") +
          (extra.length ? ` — extra ${JSON.stringify(extra)}` : "")
      );
    }

    // Spell slots per level 1-20 (srd null = non-caster = all zeros)
    for (let level = 1; level <= 20; level++) {
      const code = slotsForClass(cls.name, level);
      const srdRow = srd.spell_slots_by_level?.[level - 1] ?? Array(9).fill(0);
      if (code.length !== srdRow.length || code.some((v, i) => v !== srdRow[i])) {
        fail(`${cls.name} L${level}: spell slots [${code}] != srd [${srdRow}]`);
      }
    }

    // ASI levels
    const codeAsi = sortNums(getAsiLevels(cls.name));
    const dbAsi = sortNums(srdAsi.get(key) ?? []);
    if (codeAsi.join(",") !== dbAsi.join(",")) {
      fail(`${cls.name}: ASI levels [${codeAsi}] != srd_class_features [${dbAsi}]`);
    }
  }

  if (problems.length > 0) {
    console.error(`\n✖ SRD consistency check FAILED — ${problems.length} mismatch(es):\n`);
    for (const p of problems) console.error("  • " + p);
    console.error("");
    process.exit(1);
  }

  console.log("✓ SRD consistency check passed — constants match the parsed ruleset.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
