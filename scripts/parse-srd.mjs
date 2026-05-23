#!/usr/bin/env node
/**
 * SRD Markdown Parser
 * Reads docs/rules/ markdown files and upserts parsed data to Supabase.
 *
 * Setup:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to your .env file (Supabase → Settings → API)
 *   2. Run: node scripts/parse-srd.mjs
 *
 * Tables populated:
 *   srd_spells, srd_class_features, srd_feats,
 *   srd_classes, srd_backgrounds, srd_feature_details, srd_rules
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// ── Load .env manually (no dotenv dependency) ──────────────────────────────
const envPath = join(root, ".env");
const env = {};
try {
  readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const [k, ...rest] = line.split("=");
    if (k && !k.startsWith("#")) env[k.trim()] = rest.join("=").trim();
  });
} catch {
  console.error("Could not read .env file");
}

const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Modes that never touch the DB don't need credentials.
const NO_DB = process.argv.includes("--dry-run") || process.argv.includes("--emit-levels");

if ((!SUPABASE_URL || !SERVICE_ROLE_KEY) && !NO_DB) {
  console.error("ERROR: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file");
  process.exit(1);
}

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY) : null;

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[''']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Strip all HTML tags from a string */
function stripHtml(str) {
  return (str ?? "").replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

/** Extract text from between <td> tags */
function extractCells(rowHtml) {
  return [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
    .map((m) => stripHtml(m[1]).trim());
}

async function upsertBatch(table, rows, conflictKey) {
  const CHUNK = 200;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflictKey, ignoreDuplicates: false });
    if (error) {
      console.error(`  Error upserting ${table}:`, error.message);
    } else {
      total += chunk.length;
    }
  }
  return total;
}

// ── Spell slot tables by class (2024 PHB) ──────────────────────────────────
// Full casters: Bard, Cleric, Druid, Sorcerer, Wizard
const FULL_CASTER_SLOTS = [
  [2,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
  [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0],
  [4,3,3,3,2,1,1,0,0],
  [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1],
  [4,3,3,3,3,1,1,1,1],
  [4,3,3,3,3,2,1,1,1],
  [4,3,3,3,3,2,2,1,1],
];
// Half casters: Paladin, Ranger (get slots at level 2+)
const HALF_CASTER_SLOTS = [
  [0,0,0,0,0,0,0,0,0],
  [2,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [3,0,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,2,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,0,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,1,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,1,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
  [4,3,3,3,2,0,0,0,0],
];
// Warlock: pact magic (slots are special — shown as short-rest slots, not long-rest)
// Treated as 1/3 caster slots for display purposes in the wizard
const WARLOCK_SLOTS = [
  [1,0,0,0,0,0,0,0,0],
  [2,0,0,0,0,0,0,0,0],
  [0,2,0,0,0,0,0,0,0],
  [0,2,0,0,0,0,0,0,0],
  [0,0,2,0,0,0,0,0,0],
  [0,0,2,0,0,0,0,0,0],
  [0,0,0,2,0,0,0,0,0],
  [0,0,0,2,0,0,0,0,0],
  [0,0,0,0,2,0,0,0,0],
  [0,0,0,0,2,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,3,0,0,0,0],
  [0,0,0,0,4,0,0,0,0],
  [0,0,0,0,4,0,0,0,0],
  [0,0,0,0,4,0,0,0,0],
  [0,0,0,0,4,0,0,0,0],
];

const CLASS_SLOT_TABLE = {
  bard: FULL_CASTER_SLOTS,
  cleric: FULL_CASTER_SLOTS,
  druid: FULL_CASTER_SLOTS,
  sorcerer: FULL_CASTER_SLOTS,
  wizard: FULL_CASTER_SLOTS,
  paladin: HALF_CASTER_SLOTS,
  ranger: HALF_CASTER_SLOTS,
  warlock: WARLOCK_SLOTS,
};

// ── Parse Spells ───────────────────────────────────────────────────────────

function parseSpells(rawContent) {
  const spells = [];
  // Normalize CRLF → LF: the source is checked out with Windows line endings,
  // and a trailing \r breaks the `$`-anchored header/field regexes below.
  const content = rawContent.replace(/\r\n?/g, "\n");
  const entries = content.split(/\n(?=#### )/);

  for (const entry of entries) {
    const lines = entry.trim().split("\n");
    const headerMatch = lines[0]?.match(/^#### (.+)$/);
    if (!headerMatch) continue;

    const name = headerMatch[1].trim();
    if (["Spell Slots", "Casting without Slots", "Using a Higher-Level Spell Slot"].includes(name)) continue;

    let level = 0, school = null, classes = [];
    let concentration = false, ritual = false;

    // The level/school line (e.g. "_Level 2 Evocation (Wizard)_") is the first
    // non-empty line after the header — there's a blank line in between, so we
    // can't rely on lines[1].
    const metaLine = (lines.slice(1).find((l) => l.trim() !== "") ?? "")
      .replace(/[_]/g, "")
      .trim();
    const levelMatch = metaLine.match(/Level (\d+) ([A-Za-z]+) \(([^)]+)\)/);
    const cantrip = metaLine.match(/([A-Za-z]+) Cantrip \(([^)]+)\)/);

    if (levelMatch) {
      level = parseInt(levelMatch[1]);
      school = levelMatch[2];
      classes = levelMatch[3].split(",").map((c) => c.trim());
    } else if (cantrip) {
      level = 0;
      school = cantrip[1];
      classes = cantrip[2].split(",").map((c) => c.trim());
    } else {
      // No "Level N School (classes)" / "School Cantrip (...)" line → this #### is
      // a stat-block subsection inside a summon spell (Actions/Traits/etc.), not a
      // real spell. Skip it.
      continue;
    }

    const fields = {};
    let descLines = [], inDesc = false;

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      const castMatch = line.match(/^\*\*Casting Time:\*\* (.+)$/);
      const rangeMatch = line.match(/^\*\*Range:\*\* (.+)$/);
      const compMatch = line.match(/^\*\*Components:\*\* (.+)$/);
      const durMatch = line.match(/^\*\*Duration:\*\* (.+)$/);
      if (castMatch) { fields.casting_time = castMatch[1].trim(); inDesc = false; continue; }
      if (rangeMatch) { fields.range_text = rangeMatch[1].trim(); inDesc = false; continue; }
      if (compMatch) { fields.components_raw = compMatch[1].trim(); inDesc = false; continue; }
      if (durMatch) {
        const dur = durMatch[1].trim();
        fields.duration = dur;
        concentration = dur.toLowerCase().includes("concentration");
        inDesc = false; continue;
      }
      if (fields.duration && !inDesc && line.trim() === "") { inDesc = true; continue; }
      if (inDesc && line.trim()) descLines.push(line);
    }

    if (fields.casting_time?.includes("Ritual")) ritual = true;

    const comps = fields.components_raw
      ? fields.components_raw.split(",").map((c) => c.trim()).filter(Boolean)
      : null;

    const description = descLines.join("\n").trim();
    const dmgTypeMatch = description.match(/\b(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder)\b/);
    const damageDiceMatch = description.match(/(?:takes|taking|deal|deals) (\d+d\d+)/i);
    let attackType = null;
    if (description.toLowerCase().includes("ranged spell attack")) attackType = "ranged";
    else if (description.toLowerCase().includes("melee spell attack")) attackType = "melee";

    if (name) {
      spells.push({
        index: slugify(name),
        name, level, school,
        casting_time: fields.casting_time ?? null,
        range_text: fields.range_text ?? null,
        components: comps,
        duration: fields.duration ?? null,
        concentration, ritual,
        description: description || null,
        damage_type: dmgTypeMatch ? dmgTypeMatch[1].toLowerCase() : null,
        damage_dice: damageDiceMatch ? damageDiceMatch[1] : null,
        classes: classes.length > 0 ? classes : null,
        attack_type: attackType,
      });
    }
  }
  return spells;
}

// ── Parse Class Features (level → feature name rows) ──────────────────────

function parseClassFeatures(content) {
  const rows = [];
  const classSections = content.split(/\n(?=## [A-Z])/);

  for (const section of classSections) {
    const classMatch = section.match(/^## ([A-Za-z]+)/);
    if (!classMatch) continue;
    const className = classMatch[1];

    const tableMatch = section.match(/<table[\s\S]*?<\/table>/gi);
    if (!tableMatch) continue;

    for (const table of tableMatch) {
      if (!table.includes("Class Features")) continue;
      const rowMatches = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)];
      for (const rowMatch of rowMatches) {
        const cells = [...rowMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
        if (cells.length < 3) continue;
        const level = parseInt(cells[0][1].trim());
        if (isNaN(level)) continue;
        const featuresCell = cells[2]?.[1] ?? "";
        const features = featuresCell
          .split(",")
          .map((f) => f.trim())
          .filter((f) => f && f !== "—" && f !== "-");
        for (const feature of features) {
          rows.push({ class_name: className, level, feature_name: feature });
        }
      }
      break;
    }
  }
  return rows;
}

// ── Parse Feats ────────────────────────────────────────────────────────────

function parseFeats(content) {
  const feats = [];
  const entries = content.split(/\n(?=#### )/);
  let currentCategory = "General";

  for (const entry of entries) {
    const catMatch = entry.match(/^### (Origin|General|Fighting Style|Epic Boon) Feats/);
    if (catMatch) { currentCategory = catMatch[1]; }

    const lines = entry.trim().split("\n");
    const headerMatch = lines[0]?.match(/^#### (.+)$/);
    if (!headerMatch) continue;

    const name = headerMatch[1].trim();
    let category = currentCategory, prerequisite = null, descLines = [], inDesc = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const italicLine = line.match(/^_(.+)_$/);
      if (italicLine) {
        const text = italicLine[1];
        if (text.includes("Feat")) {
          const catExtract = text.replace("Feat", "").trim();
          if (catExtract) category = catExtract;
        } else if (text.startsWith("Prerequisite:")) {
          prerequisite = text.replace("Prerequisite:", "").trim();
        }
        inDesc = true; continue;
      }
      if (inDesc || !italicLine) {
        if (line.trim()) descLines.push(line);
      }
    }

    if (name) {
      feats.push({
        index: slugify(name),
        name, category, prerequisite,
        description: descLines.join("\n").trim() || "See Player's Handbook.",
      });
    }
  }
  return feats;
}

// ── Parse Full Class Data (hit die, saving throws, skills, subclasses) ────

function parseClasses(content) {
  const classes = [];
  const classSections = content.split(/\n(?=## [A-Z])/);

  for (const section of classSections) {
    const classMatch = section.match(/^## ([A-Za-z]+)/);
    if (!classMatch) continue;
    const name = classMatch[1];
    const index = name.toLowerCase();

    let hitDie = 8;
    let primaryAbility = "";
    let savingThrows = [];
    let skillCount = 2;
    let skillChoices = [];
    let weaponProficiencies = null;
    let armorProficiencies = null;
    let startingEquipment = null;
    let subclasses = [];

    // Parse core traits from the first HTML table (has no "Class Features" header)
    const allTables = [...(section.matchAll(/<table[\s\S]*?<\/table>/gi))];
    for (const tableMatch of allTables) {
      const tableHtml = tableMatch[0];
      if (tableHtml.includes("Class Features")) continue; // skip level table

      const rows = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)];
      for (const row of rows) {
        const cells = extractCells(row[0]);
        if (cells.length < 2) continue;
        const [label, value] = cells;

        if (label.includes("Hit Point Die")) {
          const m = value.match(/D(\d+)/i);
          if (m) hitDie = parseInt(m[1]);
        }
        if (label.includes("Primary Ability")) {
          primaryAbility = value;
        }
        if (label.includes("Saving Throw")) {
          savingThrows = value
            .split(/\s+and\s+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        }
        if (label.includes("Skill Proficiencies")) {
          // "Choose 2: Arcana, History, ..."
          const countMatch = value.match(/Choose (\d+)/i);
          if (countMatch) skillCount = parseInt(countMatch[1]);
          const listPart = value.replace(/Choose \d+[^:]*:\s*/i, "");
          skillChoices = listPart
            .split(/,\s*|\s+or\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 2);
        }
        if (label.includes("Weapon Proficiencies")) {
          weaponProficiencies = value;
        }
        if (label.includes("Armor Training") || label.includes("Armor Proficiencies")) {
          armorProficiencies = value;
        }
        if (label.includes("Starting Equipment")) {
          startingEquipment = value;
        }
      }
      break; // only first non-features table
    }

    // Extract subclass names from "#### Level 3: Barbarian Subclass" then nearby text
    const subclassHeaderMatch = section.match(/\*\*([^*]+)\*\* Subclass/g);
    if (subclassHeaderMatch) {
      // Find lines like: "**Path of the Berserker**, **Path of the Wild Heart**"
      const subclassListMatch = section.match(/\*\*([^*]+)\*\*(?:,\s*\*\*([^*]+)\*\*)*/g);
      if (subclassListMatch) {
        const allBold = [...section.matchAll(/\*\*([^*\n]+)\*\*/g)].map((m) => m[1]);
        // Subclass names tend to start with "Path of", "College of", "Circle of", "Oath of", etc.
        const subclassPrefixes = /^(Path|College|Circle|Oath|School|Order|Way|Warrior|Domain|Patron|Sorcery|Archetype|Conclave|Roguish)/i;
        subclasses = allBold.filter((b) => subclassPrefixes.test(b));
      }
    }

    const slotTable = CLASS_SLOT_TABLE[index] ?? null;
    const isSpellcaster = slotTable !== null;
    const spellcastingAbility = {
      bard: "Charisma", cleric: "Wisdom", druid: "Wisdom",
      paladin: "Charisma", ranger: "Wisdom", sorcerer: "Charisma",
      warlock: "Charisma", wizard: "Intelligence",
    }[index] ?? null;

    classes.push({
      index,
      name,
      hit_die: hitDie,
      primary_ability: primaryAbility,
      saving_throws: savingThrows,
      skill_count: skillCount,
      skill_choices: skillChoices,
      weapon_proficiencies: weaponProficiencies,
      armor_proficiencies: armorProficiencies,
      starting_equipment: startingEquipment,
      subclasses,
      is_spellcaster: isSpellcaster,
      spellcasting_ability: spellcastingAbility,
      spell_slots_by_level: slotTable ? JSON.stringify(slotTable) : null,
    });
  }
  return classes;
}

// ── Parse Feature Descriptions ─────────────────────────────────────────────
// Format: "#### Level N: Feature Name" then description paragraphs until next ####

function parseFeatureDetails(content) {
  const rows = [];
  const classSections = content.split(/\n(?=## [A-Z])/);

  for (const section of classSections) {
    const classMatch = section.match(/^## ([A-Za-z]+)/);
    if (!classMatch) continue;
    const className = classMatch[1];

    // Match all "#### Level N: Feature Name" blocks
    const featureBlocks = section.split(/\n(?=#### Level \d+:)/);
    for (const block of featureBlocks) {
      const headerMatch = block.match(/^#### Level (\d+): (.+)$/m);
      if (!headerMatch) continue;

      const level = parseInt(headerMatch[1]);
      const featureName = headerMatch[2].trim();

      // Collect description lines — everything after the header until the next ####
      const afterHeader = block.slice(block.indexOf(headerMatch[0]) + headerMatch[0].length);
      const descLines = afterHeader
        .split("\n")
        .filter((l) => !l.startsWith("####"))
        .join("\n")
        .trim();

      if (featureName && descLines) {
        rows.push({
          class_name: className,
          feature_name: featureName,
          level,
          description: descLines,
        });
      }
    }
  }
  return rows;
}

// ── Parse Backgrounds ──────────────────────────────────────────────────────

function parseBackgrounds(content) {
  const backgrounds = [];
  const entries = content.split(/\n(?=#### )/);

  for (const entry of entries) {
    const lines = entry.trim().split("\n");
    const headerMatch = lines[0]?.match(/^#### (.+)$/);
    if (!headerMatch) continue;

    const name = headerMatch[1].trim();
    // Skip non-background headings (Ability Scores, Feat, Skill Proficiencies, etc.)
    if (["Ability Scores", "Feat", "Skill Proficiencies", "Tool Proficiency",
         "Equipment", "Creature Type", "Size", "Speed", "Special Traits"].includes(name)) continue;
    // Skip species entries
    const speciesNames = ["Dragonborn", "Dwarf", "Elf", "Gnome", "Goliath",
                          "Halfling", "Human", "Orc", "Tiefling", "Aasimar"];
    if (speciesNames.includes(name)) continue;

    let abilityScores = [], feat = null, skillProficiencies = [], toolProficiency = null, equipment = null;

    for (const line of lines.slice(1)) {
      const abilityMatch = line.match(/^\*\*Ability Scores:\*\* (.+)$/);
      const featMatch = line.match(/^\*\*Feat:\*\* (.+?)(?:\s*\(see .+\))?$/);
      const skillMatch = line.match(/^\*\*Skill Proficiencies:\*\* (.+)$/);
      const toolMatch = line.match(/^\*\*Tool Proficiency:\*\* (.+)$/);
      const equipMatch = line.match(/^\*\*Equipment:\*\* (.+)$/);

      if (abilityMatch) {
        abilityScores = abilityMatch[1].split(/,\s*/).map((s) => s.trim());
      }
      if (featMatch) {
        feat = featMatch[1].replace(/\s*\(see .+\)/, "").trim();
      }
      if (skillMatch) {
        skillProficiencies = skillMatch[1]
          .split(/\s+and\s+|,\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (toolMatch) {
        toolProficiency = toolMatch[1].replace(/\(see .+\)/, "").trim();
      }
      if (equipMatch) {
        equipment = equipMatch[1].trim();
      }
    }

    // Only add entries that look like backgrounds (have ability scores + feat)
    if (abilityScores.length > 0 && (feat || skillProficiencies.length > 0)) {
      backgrounds.push({
        index: slugify(name),
        name,
        ability_scores: abilityScores,
        feat,
        skill_proficiencies: skillProficiencies,
        tool_proficiency: toolProficiency,
        equipment_description: equipment,
      });
    }
  }
  return backgrounds;
}

// ── Parse Rules Glossary ───────────────────────────────────────────────────

function parseRulesGlossary(content) {
  const rules = [];
  const entries = content.split(/\n(?=#### )/);

  for (const entry of entries) {
    const lines = entry.trim().split("\n");
    const headerMatch = lines[0]?.match(/^#### (.+)$/);
    if (!headerMatch) continue;

    const rawTitle = headerMatch[1].trim();
    // Strip [Tag] suffixes like "[Condition]", "[Action]", "[Hazard]"
    const title = rawTitle.replace(/\s*\[[^\]]+\]\s*$/, "").trim();
    if (!title) continue;

    const descLines = lines.slice(1).filter((l) => l.trim()).join("\n").trim();
    if (!descLines) continue;

    // Determine category from tag or content
    let category = "General";
    if (rawTitle.includes("[Condition]")) category = "Condition";
    else if (rawTitle.includes("[Action]")) category = "Action";
    else if (rawTitle.includes("[Hazard]")) category = "Hazard";
    else if (rawTitle.includes("[Area of Effect]") || rawTitle.includes("Area of Effect")) category = "Area of Effect";
    else if (rawTitle.includes("[Attitude]")) category = "Attitude";

    rules.push({
      category,
      title,
      content: descLines,
    });
  }
  return rules;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const spellsOnly = process.argv.includes("--spells-only");
  const emitLevels = process.argv.includes("--emit-levels");

  // Emit just the columns that were wrong (level + damage fields), keyed by
  // index, so they can be applied without the service-role key (e.g. via MCP).
  if (emitLevels) {
    const docsDir = join(root, "docs", "rules");
    const spells = parseSpells(readFileSync(join(docsDir, "spells.md"), "utf-8"));
    const slim = spells.map((s) => ({
      index: s.index, name: s.name, level: s.level,
      damage_dice: s.damage_dice, damage_type: s.damage_type, attack_type: s.attack_type,
    }));
    process.stdout.write(JSON.stringify(slim));
    return;
  }
  console.log(`=== City of Stars — SRD Parser ===${dryRun ? " (DRY RUN — no DB writes)" : ""}\n`);

  const docsDir = join(root, "docs", "rules");

  // 1. Spells
  console.log("Parsing spells…");
  const spellsContent = readFileSync(join(docsDir, "spells.md"), "utf-8");
  const spells = parseSpells(spellsContent);
  console.log(`  Found ${spells.length} spells`);
  // Level histogram + damage-dice coverage, for sanity-checking the parse.
  const byLevel = spells.reduce((acc, s) => { acc[s.level] = (acc[s.level] ?? 0) + 1; return acc; }, {});
  console.log(`  Level distribution: ${JSON.stringify(byLevel)}`);
  console.log(`  With damage_dice: ${spells.filter((s) => s.damage_dice).length}`);
  if (dryRun) {
    console.log("  (dry run — skipping all DB writes)");
    return;
  }
  const spellCount = await upsertBatch("srd_spells", spells, "index");
  console.log(`  Upserted ${spellCount} ✓`);
  if (spellsOnly) {
    console.log("\n✓ Spells-only import complete!");
    return;
  }

  // 2. Class features (level → name rows)
  console.log("\nParsing class features (level table)…");
  const classContent = readFileSync(join(docsDir, "classes.md"), "utf-8");
  const classFeatures = parseClassFeatures(classContent);
  console.log(`  Found ${classFeatures.length} rows`);
  const cfCount = await upsertBatch("srd_class_features", classFeatures, "class_name,level,feature_name");
  console.log(`  Upserted ${cfCount} ✓`);

  // 3. Feats
  console.log("\nParsing feats…");
  const featsContent = readFileSync(join(docsDir, "feats.md"), "utf-8");
  const feats = parseFeats(featsContent);
  console.log(`  Found ${feats.length} feats`);
  const featCount = await upsertBatch("srd_feats", feats, "index");
  console.log(`  Upserted ${featCount} ✓`);

  // 4. Full class data (hit die, saving throws, skill lists, spell slots)
  console.log("\nParsing full class data…");
  const classes = parseClasses(classContent);
  console.log(`  Found ${classes.length} classes`);
  const classCount = await upsertBatch("srd_classes", classes, "index");
  console.log(`  Upserted ${classCount} ✓`);

  // 5. Feature descriptions
  console.log("\nParsing feature descriptions…");
  const featureDetails = parseFeatureDetails(classContent);
  console.log(`  Found ${featureDetails.length} feature descriptions`);
  const fdCount = await upsertBatch("srd_feature_details", featureDetails, "class_name,feature_name");
  console.log(`  Upserted ${fdCount} ✓`);

  // 6. Backgrounds
  console.log("\nParsing backgrounds…");
  const originsContent = readFileSync(join(docsDir, "character-origins.md"), "utf-8");
  const backgrounds = parseBackgrounds(originsContent);
  console.log(`  Found ${backgrounds.length} backgrounds`);
  const bgCount = await upsertBatch("srd_backgrounds", backgrounds, "index");
  console.log(`  Upserted ${bgCount} ✓`);

  // 7. Rules glossary
  console.log("\nParsing rules glossary…");
  const glossaryContent = readFileSync(join(docsDir, "rules-glossary.md"), "utf-8");
  const rules = parseRulesGlossary(glossaryContent);
  console.log(`  Found ${rules.length} glossary entries`);
  // srd_rules has no unique index — delete all first then reinsert
  await supabase.from("srd_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const rulesCount = await upsertBatch("srd_rules", rules, "title");
  console.log(`  Upserted ${rulesCount} ✓`);

  console.log("\n✓ SRD import complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
