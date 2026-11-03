#!/usr/bin/env node
/**
 * Set the app version everywhere a release needs it: package.json,
 * package-lock.json, src/tauri/tauri.conf.json, src/tauri/Cargo.toml and
 * Cargo.lock. The release workflow refuses a tag that doesn't match these.
 *
 *   node scripts/bump-version.mjs patch|minor|major   next version from package.json
 *   node scripts/bump-version.mjs 1.4.0               an exact version
 *
 * Prints the new version. Used by .github/workflows/release-on-merge.yml, and
 * by hand for a manual release.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function nextVersion(current, level) {
  if (SEMVER.test(level)) return level;
  const m = SEMVER.exec(current);
  if (!m) throw new Error(`current version "${current}" isn't x.y.z`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  if (level === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`expected patch, minor, major or x.y.z, got "${level}"`);
}

function editJson(path, edit) {
  const json = JSON.parse(readFileSync(path, "utf8"));
  edit(json);
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
}

/** Replace exactly one match, or fail: a silent miss would ship a mismatched version. */
function replaceOnce(path, pattern, replacement) {
  const text = readFileSync(path, "utf8");
  const matches = text.match(new RegExp(pattern.source, `${pattern.flags.replace("g", "")}g`));
  if (matches?.length !== 1) {
    throw new Error(`${path}: expected one match for ${pattern}, found ${String(matches?.length ?? 0)}`);
  }
  writeFileSync(path, text.replace(pattern, replacement));
}

export function bump(level) {
  const current = JSON.parse(readFileSync("package.json", "utf8")).version;
  const version = nextVersion(current, level);

  editJson("package.json", (j) => {
    j.version = version;
  });
  editJson("package-lock.json", (j) => {
    j.version = version;
    j.packages[""].version = version;
  });
  editJson("src/tauri/tauri.conf.json", (j) => {
    j.version = version;
  });
  // [package] version, the first version line in the file.
  replaceOnce("src/tauri/Cargo.toml", /^version = "[^"]+"/m, `version = "${version}"`);
  // The app's own entry in the workspace lockfile.
  replaceOnce("Cargo.lock", /(name = "cityofstars"\r?\nversion = )"[^"]+"/, `$1"${version}"`);
  return version;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("bump-version.mjs")) {
  const level = process.argv[2];
  if (!level) {
    console.error("usage: node scripts/bump-version.mjs patch|minor|major|x.y.z");
    process.exit(1);
  }
  console.log(bump(level));
}
