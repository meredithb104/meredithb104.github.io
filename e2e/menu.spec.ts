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
  await expect(nav.getByRole("menuitem", { name: "Writing" })).toBeVisible();

  // Escape closes and returns focus to the button.
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toBeHidden();
  await expect(button).toBeFocused();

  // Choosing a link closes the menu and lands on the section.
  await button.click();
  await nav.getByRole("menuitem", { name: "Work" }).click();
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
  await nav.getByRole("menuitem").last().focus();
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
  const small = await page.getByRole("navigation", { name: "Sections" }).getByRole("menuitem").evaluateAll((els) =>
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

test("a focused menu row is filled, not only ringed", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).focus();
  await page.keyboard.press("Enter"); // opening moves focus onto the first row
  const nav = page.getByRole("navigation", { name: "Sections" });
  await expect(nav.getByRole("menuitem", { name: "About" })).toBeFocused();
  const [row, panel] = await page.evaluate(() => [
    getComputedStyle(document.activeElement!).backgroundColor,
    getComputedStyle(document.querySelector('nav[aria-label="Sections"]')!).backgroundColor,
  ]);
  expect(row, "the row has its own fill").not.toBe("rgba(0, 0, 0, 0)");
  expect(row, "the fill differs from the panel").not.toBe(panel);
});

// "More": six sections behind a menu button (aria-haspopup, aria-expanded), the same component as the phone Menu.
test("More opens onto its first item, arrows move through it, Escape returns focus to its button, and an outside click closes it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Sections" });
  const button = nav.getByRole("button", { name: "More information" });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(nav.getByRole("menuitem", { name: "Lab" })).toBeHidden();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(nav.getByRole("menuitem", { name: "Lab" })).toBeVisible();
  await expect(nav.getByRole("menuitem", { name: "Dictionary" })).toBeVisible();
  // aria-controls names the list, and every link inside is a real in-page target.
  const controls = await button.getAttribute("aria-controls");
  const list = page.locator(`#${controls}`);
  const hrefs = await list.getByRole("menuitem").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).hash.slice(1)));
  expect(hrefs).toEqual(["lab", "work", "case-studies", "approach", "writing", "dictionary"]);
  for (const id of hrefs) expect(await page.locator(`#${id}`).count(), id).toBe(1);

  // Opening moved focus onto the first item (JAWS only notices the revealed panel once real focus
  // lands inside it); Up/Down/Home/End move between items and wrap, as aria-haspopup="menu" promises.
  await expect(nav.getByRole("menuitem", { name: "Lab" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(nav.getByRole("menuitem", { name: "Work" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(nav.getByRole("menuitem", { name: "Dictionary" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(nav.getByRole("menuitem", { name: "Lab" })).toBeFocused(); // wrapped
  await page.keyboard.press("ArrowUp");
  await expect(nav.getByRole("menuitem", { name: "Dictionary" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(nav.getByRole("menuitem", { name: "Lab" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();

  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.mouse.click(300, 600);
  await expect(button).toHaveAttribute("aria-expanded", "false");
});

test("the phone Menu opens onto About, and arrows walk all ten rows, skipping the hidden More button", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).focus();
  await page.keyboard.press("Enter");
  const nav = page.getByRole("navigation", { name: "Sections" });
  await expect(nav.getByRole("menuitem", { name: "About" })).toBeFocused();
  // Skills is followed by the More button's host, which CSS hides at this width; Down must skip it.
  await page.keyboard.press("End");
  await expect(nav.getByRole("menuitem", { name: "Dictionary" })).toBeFocused();
  await page.keyboard.press("Home");
  const seen: string[] = [];
  for (let i = 0; i < 10; i++) {
    seen.push(await page.evaluate(() => (document.activeElement?.textContent ?? "").trim()));
    await page.keyboard.press("ArrowDown");
  }
  expect(seen).toEqual(["About", "Contact", "Experience", "Skills", "Lab", "Work", "Case studies", "My approach", "Writing", "Dictionary"]);
  await expect(nav.getByRole("menuitem", { name: "About" })).toBeFocused(); // wrapped
});

// aria-haspopup="menu" promises a menu: the popup list carries role="menu" and its links are
// menuitems, so JAWS hands the arrow keys to the page. Which list is the popup depends on the layout.
test("the popup list has menu roles for its layout, and they follow a resize", async ({ page }) => {
  const roles = () =>
    page.evaluate(() => {
      const outer = document.getElementById("site-nav-list")!;
      const more = document.getElementById("nav-more-list")!;
      const of = (ul: Element) => ({
        list: ul.getAttribute("role"),
        items: [...ul.querySelectorAll(":scope > li")].map((li) => li.getAttribute("role")),
        links: [...ul.querySelectorAll(":scope > li > a")].map((a) => a.getAttribute("role")),
      });
      return { outer: of(outer), more: of(more) };
    });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  expect(await roles()).toEqual({
    outer: { list: "list", items: [null, null, null, null, null], links: [null, null, null, null] },
    more: { list: "menu", items: Array(6).fill("presentation"), links: Array(6).fill("menuitem") },
  });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await roles()).toEqual({
    outer: { list: "menu", items: Array(5).fill("presentation"), links: Array(4).fill("menuitem") },
    more: { list: "group", items: Array(6).fill("presentation"), links: Array(6).fill("menuitem") },
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  expect((await roles()).outer.list).toBe("list");
});

test("inside the phone menu the More list is flat and its button is hidden", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).click();
  const nav = page.getByRole("navigation", { name: "Sections" });
  await expect(nav.getByRole("menuitem")).toHaveCount(10);
  await expect(nav.locator("cui-menu-button.nav-more-toggle")).toBeHidden();
  await expect(nav.getByRole("menuitem", { name: "Dictionary" })).toBeVisible();
});

// Hovered and focused rows: the text on the tinted row must hold 7:1 in every theme, including the
// current-section row and the More button, which otherwise take the primary colour.
test("hovered and focused menu rows keep 7:1 text on their tint in every theme", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  // The buttons transition their colours; reduced motion zeroes every duration, so a reading taken
  // right after a hover is the settled colour, not a frame of the interpolation.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const ratio = async (locator: ReturnType<typeof page.locator>) =>
    locator.evaluate((el) => {
      // Computed colours arrive as rgb(), color(srgb …), or oklab() depending on how they were written
      // and minified; a canvas normalises any of them to #rrggbb.
      const toRgba = (c: string): [number, number, number, number] => {
        const ctx = document.createElement("canvas").getContext("2d")!;
        ctx.fillStyle = c;
        const n = ctx.fillStyle as string; // #rrggbb, rgba(r, g, b, a), or color(srgb r g b [/ a]) with 0..1 channels
        if (n.startsWith("#")) return [1, 3, 5].map((i) => parseInt(n.slice(i, i + 2), 16)).concat(1) as [number, number, number, number];
        const [r, g, b, a] = n.match(/[\d.]+/g)!.map(Number);
        const scale = n.startsWith("color(srgb") ? 255 : 1;
        return [r! * scale, g! * scale, b! * scale, a ?? 1];
      };
      // The colour actually painted behind the text: the element's background composited over its
      // ancestors' backgrounds (a tinted state can carry alpha).
      const painted = (start: HTMLElement): [number, number, number] => {
        let acc: [number, number, number] | null = null;
        const layers: [number, number, number, number][] = [];
        for (let e: HTMLElement | null = start; e; e = e.parentElement) layers.push(toRgba(getComputedStyle(e).backgroundColor));
        layers.push([255, 255, 255, 1]);
        for (let i = layers.length - 1; i >= 0; i--) {
          const [r, g, b, a] = layers[i]!;
          acc = acc ? [r * a + acc[0] * (1 - a), g * a + acc[1] * (1 - a), b * a + acc[2] * (1 - a)] : [r, g, b];
        }
        return acc!;
      };
      const lum = ([r, g, b]: [number, number, number]) => {
        const [R, G, B] = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * R! + 0.7152 * G! + 0.0722 * B!;
      };
      const [tr, tg, tb] = toRgba(getComputedStyle(el).color);
      const [a, b] = [lum([tr, tg, tb]), lum(painted(el as HTMLElement))];
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => { document.documentElement.dataset["theme"] = t; }, theme);
    const nav = page.getByRole("navigation", { name: "Sections" });
    const more = nav.getByRole("button", { name: "More information" });
    await more.hover();
    expect(await ratio(more), `${theme}: More information hovered`).toBeGreaterThanOrEqual(7);
    if ((await more.getAttribute("aria-expanded")) === "false") await more.click();
    await more.hover();
    expect(await ratio(more), `${theme}: More information expanded and hovered`).toBeGreaterThanOrEqual(7);
    await more.focus();
    expect(await ratio(more), `${theme}: More information expanded and focused`).toBeGreaterThanOrEqual(7);
    const lab = nav.getByRole("menuitem", { name: "Lab" });
    await lab.hover();
    expect(await ratio(lab), `${theme}: Lab hovered`).toBeGreaterThanOrEqual(7);
    await lab.evaluate((el) => el.setAttribute("aria-current", "location")); // the current-section state
    expect(await ratio(lab), `${theme}: Lab current and hovered`).toBeGreaterThanOrEqual(7);
    await lab.evaluate((el) => el.removeAttribute("aria-current"));
    await page.keyboard.press("Escape");
    const about = nav.getByRole("link", { name: "About" });
    await about.hover();
    expect(await ratio(about), `${theme}: About hovered`).toBeGreaterThanOrEqual(7);
  }
});

// Both menu buttons are Commons UI's <cui-menu-button>; expanded is bold as well as tinted, the
// label reserves its bold width, and Escape closes from anywhere while open.
test("the Commons UI menu buttons: bold when expanded without shifting, and Escape closes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const hosts = await page.locator("cui-menu-button").count();
  expect(hosts).toBe(2);
  const button = page.getByRole("navigation", { name: "Sections" }).getByRole("button", { name: "More information" });
  await expect(button).toHaveClass(/cui-menu-button--quiet/);
  const before = await button.evaluate((b) => b.getBoundingClientRect().width);
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  expect(await button.evaluate((b) => b.getBoundingClientRect().width)).toBeCloseTo(before, 0);
  expect(await button.locator(".cui-menu-button__label").evaluate((el) => getComputedStyle(el).fontWeight)).toBe("700");
  await expect(button).toHaveAccessibleName("More information");
  // Focus leaving the panel closes it before Escape could (2.4.11), so the element's Escape-from-anywhere
  // path is exercised here with the pointer: open by click, Escape with focus still on the button.
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});
