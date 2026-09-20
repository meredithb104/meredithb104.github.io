/**
 * Render the social-sharing card (1200 x 630) from og-card.html with Playwright's Chromium.
 *
 *   node scripts/og-card/render.mjs public/og-card-2026-09h.png
 *
 * Use a new file name each time the card changes: LinkedIn and Slack cache by URL. Then point
 * the og:image references in index.html and scripts/posts-lib.ts at the new name and delete
 * the old file.
 */
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const out = process.argv[2];
if (!out) {
  console.error("usage: node scripts/og-card/render.mjs <output.png>");
  process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve(here, "og-card.html")).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, type: "png" });
await browser.close();
console.log("wrote", out);
