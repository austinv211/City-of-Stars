// Applies City of Stars' launcher icons and dark system UI to the generated
// Android project.
//
// `tauri android init` writes Tauri's defaults into src/tauri/gen/android, and
// gen/ is gitignored, so every fresh init (CI does one on each release) would
// ship them. This runs straight after init (npm run tauri:android:init) and:
//
//   - copies our launcher icons over Tauri's, from src/tauri/icons/android;
//   - gives the window and the Android 12+ splash our background, instead of
//     a white flash at launch;
//   - asks for light status and navigation bar icons. The app is always dark,
//     and Tauri's MainActivity calls enableEdgeToEdge() with its default
//     SystemBarStyle.auto, which follows the phone's light/dark mode and so
//     drew dark icons, all but invisible on our app bar, on a phone in light
//     mode. (The theme can't fix that: enableEdgeToEdge sets the bars at
//     runtime, over whatever the theme says.)
//
// Each step finds the exact text Tauri's template has and fails if it isn't
// there, rather than ship the defaults after a Tauri update.
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const res = process.env.ANDROID_RES_DIR ?? root("src/tauri/gen/android/app/src/main/res");
const java = path.join(res, "..", "java");

if (!existsSync(res)) {
  console.error(`No Android project at ${res}. Run "npm run tauri:android:init" first.`);
  process.exit(1);
}

/** A file's text, or null if there is no such file. */
function readIfPresent(file) {
  try {
    return readFileSync(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Inserts `addition` after `marker` in `file`, once. Skips a file that already
 * has `applied`; fails if the marker is missing, since that means Tauri's
 * template has changed under us.
 */
function extend(file, { marker, replacement, applied }) {
  // Read it outright rather than checking it exists first: a check and a
  // later read can see different files.
  const text = readIfPresent(file);
  if (text === null) return false;
  if (text.includes(applied)) return true;
  if (!text.includes(marker)) {
    console.error(`${file} has no "${marker.trim()}" to change. Update scripts/apply-android-resources.mjs.`);
    process.exit(1);
  }
  writeFileSync(file, text.replace(marker, replacement));
  return true;
}

// ── Launcher icons ─────────────────────────────────────────────────────────
cpSync(root("src/tauri/icons/android"), res, { recursive: true });

// ── Window and splash background ───────────────────────────────────────────
// --background from globals.scss, as sRGB.
writeFileSync(
  `${res}/values/cos_colors.xml`,
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="cos_background">#FF020608</color>
</resources>
`,
);

const THEME_MARKER = "<!-- Customize your theme here. -->";
for (const variant of ["values", "values-night"]) {
  extend(`${res}/${variant}/themes.xml`, {
    marker: THEME_MARKER,
    applied: "City of Stars: always dark",
    replacement: `${THEME_MARKER}
        <!-- City of Stars: always dark (scripts/apply-android-resources.mjs). -->
        <item name="android:windowBackground">@color/cos_background</item>
        <item name="android:windowSplashScreenBackground" tools:targetApi="31">@color/cos_background</item>`,
  });
}

// ── Light system bar icons ─────────────────────────────────────────────────
const activity = readdirSync(java, { recursive: true })
  .map(String)
  .find((f) => path.basename(f) === "MainActivity.kt");
if (!activity) {
  console.error(`No MainActivity.kt under ${java}. Update scripts/apply-android-resources.mjs.`);
  process.exit(1);
}
const activityFile = path.join(java, activity);
extend(activityFile, {
  marker: "import androidx.activity.enableEdgeToEdge\n",
  applied: "import androidx.activity.SystemBarStyle",
  replacement: "import android.graphics.Color\nimport androidx.activity.SystemBarStyle\nimport androidx.activity.enableEdgeToEdge\n",
});
extend(activityFile, {
  marker: "    enableEdgeToEdge()\n",
  applied: "SystemBarStyle.dark(",
  replacement: `    // City of Stars is always dark: light bar icons whatever the phone's mode.
    enableEdgeToEdge(
      statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
      navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
    )
`,
});

console.log("Applied City of Stars launcher icons and dark system UI to the Android project.");
