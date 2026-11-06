#!/usr/bin/env node
/**
 * Checks the app on an Android emulator, in the emulator's own Chrome: the
 * same rendering engine as the Android WebView the Tauri app runs in, with a
 * real touch screen and coarse pointer.
 *
 * Signs in as the seeded test users, visits every top-level route upright and
 * then sideways, checks what tends to break on a phone and saves a screenshot
 * of each page to artifacts/android/:
 *
 *   - the touch styles are in effect (pointer: coarse)
 *   - no horizontal page scroll
 *   - no tap area under 44px
 *   - native checkboxes use the app's style, not Android's
 *   - scrolling past an end doesn't stretch the page (Android 12+)
 *
 * The app is built as the Android shell lays it out (VITE_PREVIEW_SHELL, see
 * usePlatform): no desktop title bar, the phone header and so on. It is
 * always built fresh and served on :1422, so a stale server from another run
 * can't stand in for it.
 *
 * Needs the local test stack (npm run e2e:up) and an Android SDK with an
 * emulator image. Boots the first AVD (or --avd <name>) if no device is
 * connected.
 *
 * Usage:
 *   npm run verify:android [-- --avd Medium_Phone_API_37.0]
 */

import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { assertNotProduction } from "./assert-not-production.mjs";
import { ROUTES } from "./lib/routes.mjs";
import { findSmallTapTargets } from "./lib/tap-targets.mjs";

const PORT = 1422;
const DIST = "dist-e2e-android";
const BASE = `http://127.0.0.1:${String(PORT)}`;
const SUPABASE_PORT = new URL(process.env.VITE_SUPABASE_URL ?? "http://127.0.0.1:54321").port;
const CDP_PORT = 9223;
const OUT = "artifacts/android";
const PASSWORDS = { player1: "test-password-p1", dm: "test-password-dm" };

// ── Android SDK ─────────────────────────────────────────────────────────────

const SDK =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  (process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk")
    : path.join(process.env.HOME ?? "", "Android", "Sdk"));
const exe = (name) => (process.platform === "win32" ? `${name}.exe` : name);
const ADB = path.join(SDK, "platform-tools", exe("adb"));
const EMULATOR = path.join(SDK, "emulator", exe("emulator"));

const adb = (...args) => execFileSync(ADB, args, { encoding: "utf8" }).trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(what, check, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await sleep(2000);
  }
  throw new Error(`Timed out waiting for ${what}`);
}

function connectedDevice() {
  return adb("devices")
    .split("\n")
    .slice(1)
    .some((line) => line.trim().endsWith("device"));
}

async function ensureDevice(avdName) {
  if (!existsSync(ADB)) throw new Error(`adb not found at ${ADB}. Set ANDROID_HOME.`);
  if (!connectedDevice()) {
    const avd = avdName ?? execFileSync(EMULATOR, ["-list-avds"], { encoding: "utf8" }).split(/\r?\n/)[0];
    if (!avd) throw new Error("No device connected and no AVD to boot. Create one in Android Studio.");
    console.log(`Booting emulator ${avd}…`);
    spawn(EMULATOR, ["-avd", avd, "-no-snapshot-save"], { detached: true, stdio: "ignore" }).unref();
  }
  adb("wait-for-device");
  await waitFor("Android to boot", () => adb("shell", "getprop", "sys.boot_completed") === "1", 180_000);
  adb("shell", "input", "keyevent", "KEYCODE_WAKEUP");
  adb("shell", "wm", "dismiss-keyguard");
}

// ── The app, served from this machine ───────────────────────────────────────

const reachable = () =>
  fetch(BASE)
    .then((r) => r.ok)
    .catch(() => false);

/** Builds the Android-shell preview and serves it on PORT. Returns a stop function. */
async function startServer() {
  if (await reachable()) throw new Error(`Port ${String(PORT)} is already in use. Stop whatever is serving it.`);
  console.log(`Building the Android shell preview and serving it on :${String(PORT)}…`);
  const server = spawn(
    `npx vite build --mode e2e --outDir ${DIST} --emptyOutDir && npx vite preview --mode e2e --outDir ${DIST} --host 127.0.0.1 --port ${String(PORT)} --strictPort`,
    { shell: true, stdio: "ignore", env: { ...process.env, VITE_PREVIEW_SHELL: "android" } },
  );
  await waitFor("the preview build to be served", reachable, 300_000);
  return () => {
    if (process.platform === "win32") execFileSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
    else server.kill();
  };
}

/** The phone's 127.0.0.1 ports lead to this machine's, and Chrome's DevTools to CDP_PORT. */
function bridgePorts() {
  for (const port of [PORT, SUPABASE_PORT]) adb("reverse", `tcp:${port}`, `tcp:${port}`);
  adb("forward", `tcp:${String(CDP_PORT)}`, "localabstract:chrome_devtools_remote");
}

// ── Checks ──────────────────────────────────────────────────────────────────

const results = [];

function record(page, check, pass, detail = "") {
  results.push({ page, check, pass, detail });
  const mark = pass ? "\x1b[32m✔\x1b[0m" : "\x1b[31m✘\x1b[0m";
  console.log(`  ${mark} ${check}${detail ? ` — ${detail}` : ""}`);
}

/** Inspected in the page: values the checks below compare. */
function measure() {
  const el = document.scrollingElement ?? document.body;
  const box = document.querySelector("input[type='checkbox']");
  const scrollers = [el, ...document.querySelectorAll("[data-scroll-container]")];
  return {
    coarse: matchMedia("(pointer: coarse)").matches,
    overflow: el.scrollWidth - el.clientWidth,
    checkbox: box ? getComputedStyle(box).appearance : null,
    stretchy: scrollers.filter((s) => getComputedStyle(s).overscrollBehaviorY !== "none").length,
  };
}

async function checkPage(page, label) {
  const m = await page.evaluate(measure);
  record(label, "touch styles apply (pointer: coarse)", m.coarse);
  record(label, "no horizontal page scroll", m.overflow <= 1, `${String(m.overflow)}px over`);
  record(label, "no overscroll stretch", m.stretchy === 0, `${String(m.stretchy)} scroll areas can stretch`);
  const small = await page.evaluate(findSmallTapTargets, 44);
  record(
    label,
    "tap areas >= 44px",
    small.length === 0,
    small.length ? `${String(small.length)} too small: ${small.slice(0, 4).join("; ")}` : "",
  );
  if (m.checkbox !== null) record(label, "checkboxes use the app's style", m.checkbox === "none", `appearance: ${m.checkbox}`);
}

// ── Walking the app ─────────────────────────────────────────────────────────

/**
 * Waits for the app shell's navigation (the tab bar upright, the rail
 * sideways). The network going quiet isn't enough: the app can still be on
 * its loading spinner, and checking that would pass for the wrong reason.
 */
async function waitForShell(page) {
  await page
    .locator("[aria-label='More navigation']:visible, [aria-label='Navigation rail']:visible")
    .first()
    .waitFor({ timeout: 30_000 });
}

async function signIn(page, role) {
  await page.goto(`${BASE}/login`);
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(`${role}@test.local`);
  // Enter, as on a phone keyboard: sideways, the open keyboard leaves the form
  // fields over the Sign In button.
  await page.getByLabel(/^password$/i).fill(PASSWORDS[role]);
  await page.getByLabel(/^password$/i).press("Enter");
  await waitForShell(page);
}

/** Turns the screen upright (0) or sideways (1), with auto-rotate off. */
async function rotate(page, rotation) {
  adb("shell", "settings", "put", "system", "accelerometer_rotation", "0");
  adb("shell", "settings", "put", "system", "user_rotation", String(rotation));
  await waitFor("the screen to turn", () => page.evaluate((sideways) => (innerWidth > innerHeight) === sideways, rotation === 1), 15_000);
}

async function visit(page, role, route, orientation) {
  const label = `${role} ${route} (${orientation})`;
  console.log(`\n\x1b[1m${label}\x1b[0m`);
  await page.goto(`${BASE}${route}`);
  await waitForShell(page);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500); // let layout settle
  await checkPage(page, label);
  const shot = `${OUT}/${orientation}/${role}${route.replaceAll("/", "-")}.png`;
  await page.screenshot({ path: shot });
  console.log(`    screenshot: ${shot}`);
}

/**
 * Closes tabs left on this app by earlier runs. Each one keeps realtime
 * connections open to local Supabase, and Chrome allows six per host, so a
 * few leftovers leave a new sign-in waiting forever.
 */
async function closeAppTabs(context) {
  for (const tab of context.pages()) {
    if (tab.url().startsWith("http://127.0.0.1:14")) await tab.close();
  }
}

async function main() {
  // Signing in writes sessions; never point this at production.
  assertNotProduction();
  const avd = process.argv.includes("--avd") ? process.argv[process.argv.indexOf("--avd") + 1] : undefined;
  for (const orientation of ["portrait", "landscape"]) mkdirSync(`${OUT}/${orientation}`, { recursive: true });

  await ensureDevice(avd);
  const stopServer = await startServer();
  try {
    bridgePorts();
    adb("shell", "am", "start", "-n", "com.android.chrome/com.google.android.apps.chrome.Main", "-d", `${BASE}/login`);
    await waitFor("Chrome's DevTools socket", () => fetch(`http://127.0.0.1:${String(CDP_PORT)}/json/version`).then((r) => r.ok, () => false), 30_000);

    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${String(CDP_PORT)}`);
    const context = browser.contexts()[0];
    await closeAppTabs(context);
    const page = await context.newPage();
    try {
      for (const [rotation, orientation] of [[0, "portrait"], [1, "landscape"]]) {
        await rotate(page, rotation);
        for (const [role, routes] of Object.entries(ROUTES)) {
          await signIn(page, role);
          for (const route of routes) await visit(page, role, route, orientation);
        }
      }
    } finally {
      await rotate(page, 0);
      await page.close();
      await browser.close();
    }
  } finally {
    stopServer();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${String(results.length - failed.length)}/${String(results.length)} checks passed`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL [${f.page}] ${f.check}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
