// Copies the app's launcher icons into the generated Android project.
//
// `tauri android init` writes Tauri's default icons into
// src/tauri/gen/android, and gen/ is gitignored, so every fresh init (CI does
// one on each release) would ship the default icon. This runs after init and
// overwrites them with ours from src/tauri/icons/android.
import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

const source = root("src/tauri/icons/android");
const target = root("src/tauri/gen/android/app/src/main/res");

if (!existsSync(target)) {
  console.error(`No Android project at ${target}. Run "npm run tauri:android:init" first.`);
  process.exit(1);
}

cpSync(source, target, { recursive: true });
console.log("Applied City of Stars launcher icons to the Android project.");
