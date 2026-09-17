import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** The phone-width navigation menu: a disclosure button over the same list the desktop shows. */

test("below 72em the nav collapses behind a Menu button with correct state", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menu" });
  const nav = page.getByRole("navigation", { name: "Sections" });
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toBeHidden();

  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Writing" })).toBeVisible();

  // Escape closes and returns focus to the button.
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toBeHidden();
  await expect(button).toBeFocused();

  // Choosing a link closes the menu and lands on the section.
  await button.click();
  await nav.getByRole("link", { name: "Work" }).click();
  await expect(nav).toBeHidden();
  await expect(page.locator("#work")).toBeFocused();
});

test("the open menu is axe-clean and every item is a real target", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
  const small = await page.getByRole("navigation", { name: "Sections" }).getByRole("link").evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().height).filter((h) => h < 44),
  );
  expect(small).toEqual([]);
});

test("at 72em and above the full nav shows, the button does not, and the header is sticky", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Contact" })).toBeVisible();
  expect(await page.locator(".site-header").evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
  // One row: the header is no taller than its declared minimum plus padding.
  const h = await page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().height);
  expect(h).toBeLessThan(90);
});

test("without JavaScript the full list is simply visible", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Menu" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Contact" })).toBeVisible();
  await context.close();
});
