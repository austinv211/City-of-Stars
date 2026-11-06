// Applies City of Stars' launcher icons and window theme to the generated
// Android project.
//
// `tauri android init` writes Tauri's defaults into src/tauri/gen/android, and
// gen/ is gitignored, so every fresh init (CI does one on each release) would
// ship them. This runs straight after init (npm run tauri:android:init) and:
//
//   - copies our launcher icons over Tauri's, from src/tauri/icons/android;
//   - themes the window for an app that is always dark: light status and
//     navigation bar icons (dark ones vanish on our background), transparent
//     system bars so the app bar and tab bar show through, and our background
//     for the window and the Android 12+ splash, instead of a white flash.
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const res = process.env.ANDROID_RES_DIR ?? root("src/tauri/gen/android/app/src/main/res");

if (!existsSync(res)) {
  console.error(`No Android project at ${res}. Run "npm run tauri:android:init" first.`);
  process.exit(1);
}

// ── Launcher icons ─────────────────────────────────────────────────────────
cpSync(root("src/tauri/icons/android"), res, { recursive: true });

// ── Window theme ───────────────────────────────────────────────────────────
// --background from globals.scss, as sRGB.
writeFileSync(
  `${res}/values/cos_colors.xml`,
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="cos_background">#FF020608</color>
</resources>
`,
);

/** A file's text, or null if there is no such file. */
function readIfPresent(file) {
  try {
    return readFileSync(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

const MARKER = "<!-- Customize your theme here. -->";
const THEME = `${MARKER}
        <!-- City of Stars: always dark (scripts/apply-android-resources.mjs). -->
        <item name="android:windowBackground">@color/cos_background</item>
        <item name="android:windowSplashScreenBackground" tools:targetApi="31">@color/cos_background</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar" tools:targetApi="27">false</item>`;

for (const variant of ["values", "values-night"]) {
  const file = `${res}/${variant}/themes.xml`;
  // Read it outright rather than checking it exists first: a check and a
  // later read can see different files.
  const xml = readIfPresent(file);
  if (xml === null) continue;
  if (xml.includes("City of Stars: always dark")) continue; // already applied
  if (!xml.includes(MARKER)) {
    // Tauri's template changed: fail rather than ship the default theme.
    console.error(`${file} has no "${MARKER}" to extend. Update scripts/apply-android-resources.mjs.`);
    process.exit(1);
  }
  writeFileSync(file, xml.replace(MARKER, THEME));
}

console.log("Applied City of Stars launcher icons and window theme to the Android project.");
