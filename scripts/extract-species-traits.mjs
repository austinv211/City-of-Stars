#!/usr/bin/env node
// One-off helper: extract each species' named traits from the SRD source
// (docs/rules/character-origins.md) and print JSON. Print-only — no DB writes.
//   node scripts/extract-species-traits.mjs

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "..", "docs", "rules", "character-origins.md"), "utf-8")
  .replace(/\r/g, ""); // normalize CRLF → LF

// Isolate the "Species Descriptions" subsection (skip the explanatory
// "Parts of a Species" headers and the Backgrounds section above it).
const speciesPart = content.split(/### Species Descriptions/)[1] ?? "";

const result = {};
for (const block of speciesPart.split(/\n(?=#### )/)) {
  const nameMatch = block.match(/^#### (.+)$/m);
  if (!nameMatch) continue;
  const species = nameMatch[1].trim();

  const traits = [];
  for (const line of block.split("\n")) {
    // Traits look like:  _Trait Name._ Description text...
    const m = line.match(/^_([^_]+?)\._\s*(.+)$/);
    if (m) traits.push({ name: m[1].trim(), description: m[2].trim() });
  }
  if (traits.length > 0) result[species] = traits;
}

const ts = `// AUTO-GENERATED from docs/rules/character-origins.md by
// scripts/extract-species-traits.mjs — do not edit by hand. Re-run the script to refresh.
// 2024 SRD species traits (9 species; Aasimar is PHB-only and not in the SRD).

export interface SpeciesTrait {
  name: string;
  description: string;
}

export const SPECIES_TRAITS: Record<string, SpeciesTrait[]> = ${JSON.stringify(result, null, 2)};
`;

const outPath = join(__dirname, "..", "src", "frontend", "features", "characters", "data", "speciesTraits.ts");
writeFileSync(outPath, ts);
console.log(`Wrote ${outPath} (${Object.keys(result).length} species)`);

