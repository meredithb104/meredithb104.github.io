import { expect, test, type Page } from "@playwright/test";

/** Six sections sit under the "More" disclosure on wide screens; open it before reaching for one. */
async function openMore(page: Page, navName: string): Promise<void> {
  const button = page.getByRole("navigation", { name: navName }).getByRole("button", { name: "More" });
  if ((await button.getAttribute("aria-expanded")) === "false") await button.click();
}

/** The Writing section, the archive, a post page, and the feed. */

test("the landing page lists the newest posts and links to the archive and feed", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Writing" });
  await expect(section.getByRole("link", { name: "Accessibility is a build error, not a review comment" })).toBeVisible();
  await expect(section.getByRole("link", { name: /archive has all of them/ })).toHaveAttribute("href", "/posts/");
  await expect(section.getByRole("link", { name: "Atom feed" })).toHaveAttribute("href", "/feed.xml");
  await openMore(page, "Sections");
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Writing" })).toHaveAttribute("href", "#writing");
});

test("a post page has one h1, a dated byline, and returns to the archive", async ({ page }) => {
  await page.goto("/posts/accessibility-is-a-build-error/");
  await expect(page).toHaveTitle(/Accessibility is a build error/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator("time[datetime='2026-09-17']").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "The rule" })).toBeVisible();
  await openMore(page, "Site");
  await expect(page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Writing" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "All posts" }).first().click();
  await expect(page).toHaveURL(/\/posts\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Posts" })).toBeVisible();
});

test("the Atom feed is valid XML with the post's full content", async ({ request }) => {
  const res = await request.get("/feed.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toMatch(/^<\?xml version="1.0" encoding="utf-8"\?>/);
  expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
  expect(xml).toContain("<id>https://meredithb104.github.io/posts/accessibility-is-a-build-error/</id>");
  expect(xml).toContain("&lt;h2 id=&quot;the-rule&quot;&gt;");
});

test("the skip link works on a post page", async ({ page }) => {
  await page.goto("/posts/accessibility-is-a-build-error/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});
