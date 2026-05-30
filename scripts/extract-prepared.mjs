#!/usr/bin/env node
// One-off helper: extract the "Prepared Spells" column per caster class from the
// SRD source (docs/rules/classes.md) and print JSON. Print-only — no DB writes.
// The output seeds PREPARED_SPELLS_BY_LEVEL in dnd2024.constants.ts.
//   node scripts/extract-prepared.mjs

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, "..", "docs", "rules", "classes.md"), "utf-8");

const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const cells = (rowHtml, tag) =>
  [...rowHtml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))].map((m) => strip(m[1]));

const result = {};
for (const section of content.split(/\n(?=## )/)) {
  const nameMatch = section.match(/^## (.+)$/m);
  if (!nameMatch) continue;
  const className = nameMatch[1].trim();

  // A section may contain several tables; pick the one with a Prepared Spells header.
  const tables = [...section.matchAll(/<table>[\s\S]*?<\/table>/gi)].map((m) => m[0]);
  let table = null;
  let prepIdx = -1;
  for (const t of tables) {
    const thead = t.match(/<thead>([\s\S]*?)<\/thead>/i)?.[1] ?? t;
    const headerRow = thead.match(/<tr>([\s\S]*?)<\/tr>/i)?.[1] ?? "";
    const idx = cells(headerRow, "th").findIndex((h) => /prepared spells/i.test(h));
    if (idx !== -1) { table = t; prepIdx = idx; break; }
  }
  if (!table) continue;

  const tbody = table.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  const rows = [...tbody.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map((m) => cells(m[1], "td"));
  result[className] = rows.map((r) => {
    const n = parseInt(r[prepIdx], 10);
    return Number.isFinite(n) ? n : 0;
  });
}

console.log(JSON.stringify(result, null, 2));
