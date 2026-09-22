import { expect, test } from "@playwright/test";

// Runs in the webkit-iphone project only (see playwright.config.ts). iOS Safari laid the contrast
// checker's result table out with the last column narrower than the Pass pill, so the word ran past
// the pill's border. The columns now size to content and the pill never shrinks below its content.
test("@webkit the Pass and Fail pills contain their text on an iPhone", async ({ page }) => {
  await page.goto("/");
  await page.locator("#cc-fg").fill("#1b1f24");
  await page.locator("#cc-bg").fill("#ffffff");
  await expect(page.locator(".contrast-result .pass")).toHaveCount(5);
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".contrast-result .pass, .contrast-result .fail")].map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return Math.round(range.getBoundingClientRect().right - el.getBoundingClientRect().right);
    }),
  );
  expect(overflow.every((px) => px <= 0), `content past the pill's edge by ${overflow.join(", ")}px`).toBe(true);
});

// The phone menu: every row is the full width of the panel, at least 44px tall, filled on focus,
// and nothing in the panel overflows it.
test("@webkit the phone menu rows are full width, 44px tall, and filled on focus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).focus();
  await page.keyboard.press("Enter");
  const nav = page.getByRole("navigation", { name: "Sections" });
  await expect(nav).toBeVisible();
  const rows = await nav.getByRole("menuitem").evaluateAll((links) => {
    const panel = links[0]!.closest("nav")!.getBoundingClientRect();
    return links.map((a) => {
      const r = a.getBoundingClientRect();
      return { h: Math.round(r.height), inside: r.left >= panel.left && r.right <= panel.right + 0.5, width: Math.round(r.width), panel: Math.round(panel.width) };
    });
  });
  expect(rows.length).toBe(10);
  for (const row of rows) {
    expect(row.h, "row is at least 44px tall").toBeGreaterThanOrEqual(44);
    expect(row.inside, "row stays inside the panel").toBe(true);
    expect(row.width, "row spans the panel").toBeGreaterThan(row.panel - 40);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no sideways scroll with the menu open").toBe(true);

  // Safari skips links on Tab unless "Press Tab to highlight each item" is on, and Playwright's
  // WebKit does not emulate that preference, so put focus on the row directly (after a key press, so
  // :focus-visible applies) and check the row is filled.
  await page.keyboard.press("Shift");
  await nav.getByRole("menuitem", { name: "About" }).focus();
  await expect(nav.getByRole("menuitem", { name: "About" })).toBeFocused();
  const [row, panel] = await page.evaluate(() => [
    getComputedStyle(document.activeElement!).backgroundColor,
    getComputedStyle(document.querySelector('nav[aria-label="Sections"]')!).backgroundColor,
  ]);
  expect(row).not.toBe("rgba(0, 0, 0, 0)");
  expect(row).not.toBe(panel);
});

// The page tools on a phone: icon-only, 44px targets, inside the viewport, and each jump lands.
test("@webkit the page tools are 44px targets inside the viewport and jump between sections", async ({ page }) => {
  await page.goto("/");
  const tools = page.getByRole("navigation", { name: "Page" });
  await expect(tools).toBeHidden();
  await page.evaluate(() => document.getElementById("work")!.scrollIntoView({ behavior: "instant" }));
  await expect(tools).toBeVisible();

  const boxes = await tools.locator("a, button").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const label = el.querySelector(".page-tools-label")!.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, labelWidth: Math.round(label.width) };
    }),
  );
  expect(boxes.length).toBe(3);
  for (const b of boxes) {
    expect(b.w, "target width").toBeGreaterThanOrEqual(44);
    expect(b.h, "target height").toBeGreaterThanOrEqual(44);
    expect(b.inside, "inside the viewport").toBe(true);
    expect(b.labelWidth, "icon-only on a phone; the label is visually hidden").toBeLessThanOrEqual(1);
  }
  await expect(tools.getByRole("button", { name: "Next section" })).toHaveAccessibleName("Next section");

  await tools.getByRole("button", { name: "Next section" }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("experience");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await tools.getByRole("link", { name: "Back to top" }).click();
  // On a phone the <nav> is the collapsed panel (display: none), so the Top link lands on the
  // always-visible <site-nav> wrapper; the next Tab is the Menu button.
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("site-nav");
  await expect(tools).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
});
