import { expect, test } from "@playwright/test";

/**
 * WCAG 1.4.10 Reflow, 1.4.4 Resize Text, 1.4.12 Text Spacing. Layout tests
 * that only a browser can run.
 */

const PAGES = ["/", "/accessibility.html"] as const;

// The user-agent stylesheet WCAG 1.4.12 describes: the page must not lose content or function.
const TEXT_SPACING_CSS = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`;

async function overflows(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => document.scrollingElement!.scrollWidth - document.scrollingElement!.clientWidth);
}

for (const path of PAGES) {
  test(`${path} reflows to 320px with no horizontal scrolling`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto(path);
    expect(await overflows(page)).toBeLessThanOrEqual(0);
  });

  test(`${path} survives the 1.4.12 text-spacing override`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 256 });
    await page.goto(path);
    await page.addStyleTag({ content: TEXT_SPACING_CSS });
    expect(await overflows(page)).toBeLessThanOrEqual(0);
    // Nothing is clipped: no element with overflow hidden has content taller than itself,
    // other than the visually-hidden utility which is meant to.
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("*")].filter((el) => {
        if (el.matches(".visually-hidden, [data-live-region], .skip-link")) return false;
        const s = getComputedStyle(el);
        return (s.overflowY === "hidden" || s.overflow === "hidden") && el.scrollHeight > el.clientHeight + 1;
      }).length,
    );
    expect(clipped).toBe(0);
  });

  test(`${path} at 200% zoom-equivalent (640px wide, 2x scale) has no horizontal scrolling`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 640, height: 512 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(path);
    expect(await overflows(page)).toBeLessThanOrEqual(0);
    await context.close();
  });
}

test("reduced motion zeroes every transition and disables smooth scrolling", async ({ page }) => {
  const read = () =>
    page.evaluate(() => ({
      link: getComputedStyle(document.querySelector("a.button")!).transitionDuration,
      card: getComputedStyle(document.querySelector(".card")!).transitionDuration,
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
    }));

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const normal = await read();
  expect(normal.link).not.toMatch(/^0s(, 0s)*$/);
  expect(normal.scroll).toBe("smooth");

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await read();
  expect(reduced.link).toMatch(/^0s(, 0s)*$/);
  expect(reduced.card).toMatch(/^0s(, 0s)*$/);
  expect(reduced.scroll).toBe("auto");
});

test("all interactive targets are at least 24 by 24 CSS pixels (2.5.8)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/");
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("a, button, input, [role='button']")]
      .filter((el) => el.offsetParent !== null || el.matches(".skip-link"))
      // A radio inside its <label> is operated through the 44px label, which is the real target.
      .filter((el) => !(el instanceof HTMLInputElement && el.type === "radio" && el.closest("label")))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { label: (el.getAttribute("aria-label") ?? el.textContent ?? el.id).trim().slice(0, 30), w: r.width, h: r.height };
      })
      // Inline links inside a sentence are exempt under 2.5.8; everything else must meet 24px.
      .filter((t) => t.w > 0 && (t.w < 24 || t.h < 24)),
  );
  expect(small, JSON.stringify(small)).toEqual([]);
});
