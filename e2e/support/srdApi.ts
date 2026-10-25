import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

/**
 * Record and replay for the public D&D 5e SRD API (plan §2.5): specs never
 * reach dnd5eapi.co. Responses recorded from /api/2014 live in
 * e2e/recordings/dnd5eapi/; a request with no recording is aborted, so a spec
 * that starts depending on a new endpoint fails loudly instead of quietly
 * going to the network.
 *
 * To record another: curl -sf "https://www.dnd5eapi.co/api/2014/<path>" -o
 * e2e/recordings/dnd5eapi/<name>.json, and map it below.
 */
const RECORDINGS: Record<string, string> = {
  "/api/2014/monsters?name=goblin": "monsters-search-goblin.json",
  "/api/2014/monsters/goblin": "monster-goblin.json",
};

export async function replaySrdApi(page: Page) {
  await page.context().route("https://www.dnd5eapi.co/**", async (route) => {
    const url = new URL(route.request().url());
    const file = RECORDINGS[url.pathname + url.search];
    if (!file) {
      console.error(`[srdApi] no recording for ${url.pathname}${url.search}`);
      await route.abort("blockedbyclient");
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: readFileSync(`e2e/recordings/dnd5eapi/${file}`, "utf8"),
    });
  });
}
