import { describe, expect, it } from "vitest";
import { compareSemver, pickAsset, type GithubRelease } from "./updates";

describe("compareSemver", () => {
  it("orders by major, minor, then patch", () => {
    expect(compareSemver("0.4.0", "0.3.9")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0", "0.99.99")).toBeGreaterThan(0);
    expect(compareSemver("0.3.1", "0.3.10")).toBeLessThan(0);
  });

  it("treats a tag and a bare version as equal", () => {
    expect(compareSemver("v0.4.0", "0.4.0")).toBe(0);
  });

  it("ignores prerelease suffixes", () => {
    expect(compareSemver("v0.4.0", "0.4.0-beta.1")).toBe(0);
  });
});

describe("pickAsset", () => {
  const release: GithubRelease = {
    tag_name: "v0.4.0",
    html_url: "https://github.com/austinv211/City-of-Stars/releases/tag/v0.4.0",
    assets: [
      {
        name: "cityofstars_linux_v0.4.0.AppImage",
        browser_download_url: "https://dl/appimage",
      },
      { name: "cityofstars_linux_v0.4.0.deb", browser_download_url: "https://dl/deb" },
      {
        name: "cityofstars_v0.4.0_android.apk",
        browser_download_url: "https://dl/apk",
      },
      {
        name: "cityofstars_windows_v0.4.0_x64-setup.exe",
        browser_download_url: "https://dl/exe",
      },
    ],
  };

  it("finds the APK for Android", () => {
    expect(pickAsset(release, "android")).toBe("https://dl/apk");
  });

  it("finds the .deb for Debian installs", () => {
    expect(pickAsset(release, "deb")).toBe("https://dl/deb");
  });

  it("falls back to the release page when the asset is missing", () => {
    expect(pickAsset({ ...release, assets: [] }, "android")).toBe(release.html_url);
  });
});
