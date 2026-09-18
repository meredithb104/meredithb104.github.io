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

test("the open menu is an anchored panel under the button; every row is a full-width 44px target", async ({ page }) => {
  for (const width of [375, 1024]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/");
    const button = page.getByRole("button", { name: "Menu" });
    await button.click();
    const geo = await page.evaluate(() => {
      const btn = document.querySelector<HTMLElement>(".nav-toggle")!.getBoundingClientRect();
      const panel = document.querySelector<HTMLElement>(".site-nav nav")!.getBoundingClientRect();
      const links = [...document.querySelectorAll<HTMLElement>(".site-nav ul a")].map((a) => {
        const b = a.getBoundingClientRect();
        // A tap anywhere along the row, including its far right, must land on the link.
        const hitRight = document.elementFromPoint(b.right - 6, b.top + b.height / 2);
        const hitLeft = document.elementFromPoint(b.left + 6, b.top + b.height / 2);
        return { text: a.textContent!.trim(), w: Math.round(b.width), h: Math.round(b.height), rowSpansPanel: b.width >= panel.width - 32, hits: (hitRight === a || a.contains(hitRight!)) && (hitLeft === a || a.contains(hitLeft!)) };
      });
      return { vw: innerWidth, btn: { right: Math.round(btn.right), bottom: Math.round(btn.bottom) }, panel: { x: Math.round(panel.x), right: Math.round(panel.right), top: Math.round(panel.top), w: Math.round(panel.width) }, links };
    });
    // Anchored: the panel's top edge is just below the button and its right edge lines up with the button's.
    expect(geo.panel.top).toBeGreaterThanOrEqual(geo.btn.bottom);
    expect(geo.panel.top - geo.btn.bottom).toBeLessThan(24);
    expect(Math.abs(geo.panel.right - geo.btn.right)).toBeLessThan(4);
    // Sized: about a quarter of a wide screen; the full width minus gutters on a phone.
    if (width >= 1000) { expect(geo.panel.w).toBeGreaterThanOrEqual(width * 0.24); expect(geo.panel.w).toBeLessThanOrEqual(width * 0.34); }
    else expect(geo.panel.w).toBeGreaterThanOrEqual(width - 64);
    for (const l of geo.links) {
      expect(l.h, `${l.text} height`).toBeGreaterThanOrEqual(44);
      expect(l.rowSpansPanel, `${l.text} spans the panel`).toBe(true);
      expect(l.hits, `${l.text} is hit at both ends of its row`).toBe(true);
    }
  }
});

test("the panel closes on an outside click and when focus tabs past its last link", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 812 });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menu" });
  const nav = page.getByRole("navigation", { name: "Sections" });
  await button.click();
  await expect(nav).toBeVisible();
  await page.mouse.click(200, 600);
  await expect(nav).toBeHidden();
  await expect(button).toHaveAttribute("aria-expanded", "false");

  await button.click();
  await nav.getByRole("link").last().focus();
  await page.keyboard.press("Tab");
  await expect(nav).toBeHidden();
  // Focus moved on to the page content and is not under a closed panel.
  const onPage = await page.evaluate(() => !document.activeElement?.closest(".site-nav"));
  expect(onPage).toBe(true);
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

test("Public Sans is the default and preloaded; Atkinson loads only when chosen; the choice survives reload", async ({ page }) => {
  const fontRequests: string[] = [];
  page.on("request", (r) => { if (r.url().includes("/fonts/")) fontRequests.push(r.url()); });
  await page.goto("/");
  await page.waitForFunction(() => document.fonts.check('16px "Public Sans"'));
  expect(fontRequests.some((u) => u.includes("public-sans-latin.woff2")), "Public Sans requested").toBe(true);
  expect(fontRequests.some((u) => u.includes("atkinson")), "Atkinson not requested by default").toBe(false);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/Public Sans/);

  await page.getByRole("radio", { name: "Atkinson Hyperlegible Next" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-font", "atkinson");
  await page.waitForFunction(() => document.fonts.check('16px "Atkinson Hyperlegible Next"'));
  expect(fontRequests.some((u) => u.includes("atkinson-hyperlegible-next-latin.woff2"))).toBe(true);
  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toMatch(/Atkinson Hyperlegible Next/);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-font", "atkinson");
  await expect(page.getByRole("radio", { name: "Atkinson Hyperlegible Next" })).toBeChecked();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});
