import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * APG tabs and tabbed carousel, driven from the keyboard in a real browser,
 * with an axe pass in the states a visitor actually reaches.
 */

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/** Let every running CSS animation finish; axe measuring a slide mid-fade reads it as low contrast. */
const settle = (page: import("@playwright/test").Page) =>
  page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)).then(() => undefined));

test("the tablist is one tab stop; arrows select; Tab lands on the panel", async ({ page }) => {
  await page.goto("/#lab");
  const tablist = page.getByRole("tablist", { name: "Carousel demo" });
  const demo = tablist.getByRole("tab", { name: "Demo" });
  const how = tablist.getByRole("tab", { name: "How it's built" });

  await demo.focus();
  await expect(demo).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(how).toBeFocused();
  await expect(how).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "How it's built" })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Demo" })).toBeHidden();

  // One tab stop: Tab leaves the tablist and lands on the focusable panel, not the next tab.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("tabpanel", { name: "How it's built" })).toBeFocused();

  await how.focus();
  await page.keyboard.press("End");
  await expect(tablist.getByRole("tab", { name: "Markup" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(demo).toBeFocused();
});

test("a hash opens the matching tab on load", async ({ page }) => {
  await page.goto("/#tab-markup");
  await expect(page.getByRole("tab", { name: "Markup" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Markup" })).toBeVisible();
});

test("the carousel exposes one slide at a time and never moves on its own", async ({ page }) => {
  await page.goto("/#lab");
  const carousel = page.getByRole("group", { name: "Twelve mistakes I keep finding" });
  await expect(carousel).toHaveAttribute("aria-roledescription", "carousel");

  const first = carousel.getByRole("tabpanel", { name: "1 of 12" });
  await expect(first).toBeVisible();
  await expect(carousel.getByRole("tabpanel", { name: "2 of 12" })).toBeHidden();
  await page.waitForTimeout(1500);
  await expect(first).toBeVisible();

  const next = carousel.getByRole("button", { name: "Next slide" });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(carousel.getByRole("tabpanel", { name: "2 of 12" })).toBeVisible();
  await expect(first).toBeHidden();
  await expect(next).toBeFocused();
  // The announcement is one short line: position and heading, not the slide body.
  await expect(page.locator('[data-live-region="polite"]')).toHaveText("Slide 2 of 12: Icon buttons with no name");
  expect(await carousel.locator("[data-track]").getAttribute("aria-live")).toBeNull();

  // Left/Right on either button move slides too, so it doesn't matter which one has focus.
  await page.keyboard.press("ArrowRight");
  await expect(carousel.getByRole("tabpanel", { name: "3 of 12" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(carousel.getByRole("tabpanel", { name: "2 of 12" })).toBeVisible();
  await expect(next).toBeFocused();

  // Previous from the first slide wraps to the last.
  await carousel.getByRole("button", { name: "Previous slide" }).click();
  await carousel.getByRole("button", { name: "Previous slide" }).click();
  await expect(carousel.getByRole("tabpanel", { name: "12 of 12" })).toBeVisible();

  // Slides are not interactive, so they are not focusable: tabbing past Next leaves the carousel.
  await next.focus();
  await page.keyboard.press("Tab");
  const focusedInSlide = await page.evaluate(() => !!document.activeElement?.closest("[data-slide]"));
  expect(focusedInSlide).toBe(false);
});

test("the slide picker is a roving tablist and hidden slides are not reachable", async ({ page }) => {
  await page.goto("/#lab");
  const carousel = page.getByRole("group", { name: "Twelve mistakes I keep finding" });
  const picker = carousel.getByRole("tablist", { name: "Choose a slide" });
  const dot1 = picker.getByRole("tab", { name: "Slide 1", exact: true });
  await dot1.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(picker.getByRole("tab", { name: "Slide 3", exact: true })).toBeFocused();
  await expect(carousel.getByRole("tabpanel", { name: "3 of 12" })).toBeVisible();

  // Every hidden slide is out of the accessibility tree and the tab order.
  const reachable = await carousel.locator("[data-slide]").evaluateAll((slides) =>
    slides.map((s) => ({ hidden: (s as HTMLElement).hidden, focusables: s.querySelectorAll("a, button, input").length })),
  );
  expect(reachable.filter((s) => !s.hidden)).toHaveLength(1);

  // Dots are real 24px targets (2.5.8) at desktop width.
  const box = await dot1.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(24);
  expect(box!.height).toBeGreaterThanOrEqual(24);

  // On a phone the picker fits one centered row: 17px dots on a 25px pitch (the 2.5.8 spacing exception),
  // with Previous, the counter, and Next on the row above.
  await page.setViewportSize({ width: 375, height: 812 });
  const dots = carousel.locator(".carousel-dot");
  const rows = await dots.evaluateAll((els) => new Set(els.map((e) => (e as HTMLElement).offsetTop)).size);
  expect(rows).toBe(1);
  const pitch = await dots.evaluateAll((els) => (els[1] as HTMLElement).offsetLeft - (els[0] as HTMLElement).offsetLeft);
  expect(pitch).toBeGreaterThanOrEqual(24);
  // Read all three in one evaluation: the page may still be smooth-scrolling after the resize.
  const { prevY, counterY, nextY } = await carousel.locator(".carousel-controls").evaluate((c) => {
    const y = (sel: string) => Math.round(c.querySelector(sel)!.getBoundingClientRect().top);
    return { prevY: y(".carousel-button:first-child"), counterY: y(".carousel-counter"), nextY: y(".carousel-picker + .carousel-button") };
  });
  expect(Math.abs(prevY - nextY)).toBeLessThan(4);
  expect(Math.abs(prevY - counterY)).toBeLessThan(16);
});

test("tabs and carousel states are axe-clean in light and dark", async ({ page }) => {
  for (const theme of ["light", "dark", "high-contrast"]) {
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await page.goto("/#lab");
    await page.getByRole("button", { name: "Next slide" }).click();
    await page.getByRole("tab", { name: "How it's built" }).click();
    await page.getByRole("tab", { name: "Demo" }).click();
    await settle(page);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`).join("\n");
    expect(summary, `${theme}: ${summary}`).toBe("");
  }
});
