/**
 * Finding and installing new releases.
 *
 * Two paths, because only some installs can replace themselves:
 *
 *   installable  Windows (NSIS/MSI) and Linux AppImage. The Tauri updater
 *                reads `latest.json` from the latest GitHub release, verifies
 *                the signature, installs and relaunches.
 *   link         Android (sideloaded APK) and Linux .deb. Nothing can install
 *                these for the user, so we compare against the GitHub API's
 *                latest release and hand them the download.
 *
 * Every Tauri module is imported dynamically so the browser build never
 * loads them, and so the desktop-only plugins are never touched on Android.
 */

import type { Update } from "@tauri-apps/plugin-updater";
import type { ShellPlatform } from "@/core/hooks/usePlatform";

const REPO = "austinv211/City-of-Stars";
const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface GithubRelease {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
}

type LinkKind = "android" | "deb";

export type UpdateCheck =
  | { kind: "installable"; version: string; update: Update }
  | { kind: "link"; version: string; url: string }
  | { kind: "none" };

const NONE: UpdateCheck = { kind: "none" };

/**
 * Negative, zero or positive as `a` is older than, equal to or newer than `b`.
 * Takes tags or bare versions ("v0.4.0" or "0.4.0"). Prerelease suffixes are
 * dropped: `releases/latest` never returns a prerelease, so a suffix only
 * shows up on the installed side, and 0.4.0-beta should count as 0.4.0.
 */
export function compareSemver(a: string, b: string): number {
  const parts = (v: string) =>
    v.replace(/^v/, "").split("-")[0].split(".").map((n) => Number(n) || 0);
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * The download for this install from the asset names `release.yml` produces.
 * Falls back to the release page if a build was missing from the release.
 */
export function pickAsset(release: GithubRelease, kind: LinkKind): string {
  const match = (name: string) =>
    kind === "android" ? name.endsWith("_android.apk") : name.startsWith("cityofstars_linux_") && name.endsWith(".deb");
  return release.assets.find((a) => match(a.name))?.browser_download_url ?? release.html_url;
}

async function fetchLatestRelease(): Promise<GithubRelease> {
  const res = await fetch(LATEST_RELEASE_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub releases request failed: ${String(res.status)}`);
  return (await res.json()) as GithubRelease;
}

async function checkLink(kind: LinkKind, current: string): Promise<UpdateCheck> {
  const release = await fetchLatestRelease();
  if (compareSemver(release.tag_name, current) <= 0) return NONE;
  return {
    kind: "link",
    version: release.tag_name.replace(/^v/, ""),
    url: pickAsset(release, kind),
  };
}

export async function getAppVersion(): Promise<string> {
  const { getVersion } = await import("@tauri-apps/api/app");
  return getVersion();
}

export async function checkForUpdate(platform: ShellPlatform): Promise<UpdateCheck> {
  if (platform === "browser" || platform === "ios") return NONE;
  if (platform === "android") return checkLink("android", await getAppVersion());
  if (platform === "linux") {
    const { invoke } = await import("@tauri-apps/api/core");
    if ((await invoke<string>("install_kind")) === "deb") {
      return checkLink("deb", await getAppVersion());
    }
  }
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  return update ? { kind: "installable", version: update.version, update } : NONE;
}

/**
 * Downloads, installs and relaunches. `onProgress` gets a whole percentage, or
 * null when the server sent no content length. On Windows the passive
 * installer closes the app itself, so the relaunch only matters on Linux.
 */
export async function installUpdate(
  update: Update,
  onProgress: (percent: number | null) => void,
): Promise<void> {
  let total = 0;
  let received = 0;
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? 0;
    } else if (event.event === "Progress") {
      received += event.data.chunkLength;
      onProgress(total ? Math.min(100, Math.round((received / total) * 100)) : null);
    }
  });
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}

export async function openDownload(url: string): Promise<void> {
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
