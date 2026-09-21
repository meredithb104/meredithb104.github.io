import { expect, test, type Page } from "@playwright/test";

/**
 * Things axe cannot see: where focus goes, whether it stays visible, and
 * whether every control can be reached and operated from the keyboard.
 */

/** Six sections sit under the "More" disclosure on wide screens; open it before reaching for one. */
async function openMore(page: Page, navName = "Sections"): Promise<void> {
  const button = page.getByRole("navigation", { name: navName }).getByRole("button", { name: "More information" });
  if ((await button.getAttribute("aria-expanded")) === "false") await button.click();
}

async function focused(page: Page): Promise<{ tag: string; text: string; id: string; inView: boolean; unobscured: boolean }> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { tag: "body", text: "", id: "", inView: false, unobscured: false };
    // A wrapped inline link spans two line boxes; judge by its first one, where focus visibly starts.
    const r = el.getClientRects()[0] ?? el.getBoundingClientRect();
    // A focusable container (a tabpanel) can be taller than the viewport; what must be visible is
    // where focus starts, so require the top edge and at least the first 48px to be on screen.
    const inView =
      r.top >= 0 && Math.min(r.bottom, r.top + 48) <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
    // WCAG 2.4.11 Focus Not Obscured: the element's centre must be the top-most thing at that point.
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height, 48) / 2);
    const unobscured = hit !== null && (hit === el || el.contains(hit) || hit.contains(el));
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? "").trim().slice(0, 40),
      id: el.id,
      inView,
      unobscured,
    };
  });
}

test("the first Tab lands on the skip link, and the skip link moves focus to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const first = await focused(page);
  expect(first.text).toBe("Skip to main content");
  expect(first.inView, "skip link is visible while focused").toBe(true);

  await page.keyboard.press("Enter");
  await expect.poll(async () => (await focused(page)).id).toBe("main");
});

test("in-page navigation moves focus to the section and the sticky header never covers it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await openMore(page);
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Case studies" }).click();
  await expect.poll(async () => (await focused(page)).id).toBe("case-studies");
  // The section heading should be below the sticky header, not hidden under it.
  const headingTop = await page.locator("#cases-h").evaluate((el) => el.getBoundingClientRect().top);
  const headerBottom = await page.locator(".site-header").evaluate((el) => el.getBoundingClientRect().bottom);
  expect(headingTop).toBeGreaterThan(headerBottom);
});

test("every focusable element is reachable, in view, and not obscured while focused", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const seen: string[] = [];
  for (let i = 0; i < 120; i += 1) {
    await page.keyboard.press("Tab");
    let f = await focused(page);
    if (f.tag === "body") break;
    const key = `${f.tag}#${f.id}:${f.text}`;
    if (i > 0 && f.text === "Skip to main content") break; // wrapped around to the top
    seen.push(key);
    // Smooth scrolling is on (no reduced-motion emulation here), so give the scroll a moment to land.
    await expect.poll(async () => (f = await focused(page)).inView, { message: `${key} scrolled into view`, timeout: 10_000 }).toBe(true);
    expect(f.unobscured, `${key} not covered by the header`).toBe(true);
    // Let the smooth scroll finish before the next Tab: a focus change during an animation can be
    // absorbed by it, which is a test-timing artefact, not the page's behaviour.
    await page.waitForFunction(() => new Promise<boolean>((resolve) => {
      const y = scrollY;
      setTimeout(() => resolve(scrollY === y), 120);
    }));
  }
  // Sanity: we walked a real page, not an empty one.
  expect(seen.length).toBeGreaterThan(25);
  expect(seen.some((k) => k.includes("Match system"))).toBe(false); // radios are one tab stop, label text isn't the control
  expect(seen.some((k) => k.startsWith("input#cc-fg"))).toBe(true);
});

test("the theme radio group works with arrow keys and updates the document", async ({ page }) => {
  await page.goto("/");
  const auto = page.getByRole("radio", { name: "Match system" });
  await auto.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "high-contrast");
  // Persisted: survives a reload and is applied before the module runs.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "high-contrast");
  await expect(page.getByRole("radio", { name: "High contrast" })).toBeChecked();
});

test("filter toggles expose pressed state and hidden cards leave the tab order", async ({ page }) => {
  await page.goto("/");
  const backEnd = page.getByRole("button", { name: "back end" });
  await backEnd.focus();
  await page.keyboard.press("Enter");
  await expect(backEnd).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("link", { name: "Live demo of Commons UI" })).toBeHidden();
  await expect(page.getByRole("link", { name: /^Read the case study for/ })).toHaveCount(2);
});

test("the contrast checker validates and describes errors in text", async ({ page }) => {
  await page.goto("/");
  const fg = page.getByLabel("Text color", { exact: true });
  await fg.fill("oops");
  await expect(fg).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#cc-fg-error")).toHaveText(/hex color/i);
  await fg.fill("#767676");
  await expect(fg).not.toHaveAttribute("aria-invalid"); // the field drops the attribute when the error clears
  await expect(page.locator(".contrast-result .ratio")).toHaveText(/4\.54:1/);
});

test("pressing a filter chip does not move any chip (no layout shift on activation)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const pos = () => page.locator(".chip").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.width)]; }));
  const before = await pos();
  await page.getByRole("button", { name: "back end" }).click();
  expect(await pos()).toEqual(before);
  await page.getByRole("button", { name: "All" }).click();
  expect(await pos()).toEqual(before);
});

test("a fragment is cleared from the address once it has done its job", async ({ page }) => {
  // On load: the target is scrolled to (and a deep-linked tab opened), then the fragment goes.
  await page.goto("/#tab-markup");
  await expect(page.getByRole("tab", { name: "Markup" })).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  // Still scrolled to the Lab area once the browser's own fragment scroll has landed.
  await expect.poll(() => page.locator("#lab").evaluate((el) => Math.round(el.getBoundingClientRect().top)), { timeout: 10_000 }).toBeLessThan(800);

  // After an in-page jump: focus lands on the section, then the fragment goes.
  await page.goto("/");
  await openMore(page);
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Lab" }).click();
  await expect.poll(async () => (await focused(page)).id).toBe("lab");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");

  // A restyle with no fragment present changes neither scroll nor focus. Let the smooth scroll land first.
  await expect.poll(() => page.locator("#lab").evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBeLessThan(200);
  await page.getByRole("radio", { name: "Dark" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const y = await page.evaluate(() => Math.round(scrollY));
  await page.getByRole("radio", { name: "Dark" }).click();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => Math.round(scrollY))).toBe(y);
  expect(await page.evaluate(() => (document.activeElement as HTMLInputElement).value)).toBe("dark");
});

test("every fragment lands: a heading with no tabindex takes focus, on a link, on hashchange, and on load", async ({ page }) => {
  // Post headings have ids but no tabindex. A link to one (from anywhere) must still land focus there.
  await page.goto("/posts/");
  const postHref = await page.locator("main a[href^='/posts/']").first().getAttribute("href");
  await page.goto(postHref!);
  const headingId = await page.locator("main h2[id]").last().getAttribute("id");
  expect(headingId).toBeTruthy();

  // 1. A same-document link injected by the test (posts have no in-body links to their headings).
  await page.evaluate((id) => {
    const a = document.createElement("a");
    a.href = `#${id}`;
    a.textContent = "jump";
    a.id = "test-jump";
    document.querySelector("main")!.prepend(a);
  }, headingId);
  await page.locator("#test-jump").click();
  await expect.poll(async () => (await focused(page)).id).toBe(headingId);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  // The tabindex is a temporary aid, gone once focus moves on.
  await page.keyboard.press("Tab");
  expect(await page.locator(`#${headingId}`).getAttribute("tabindex")).toBeNull();

  // 2. Back or Forward, or an edited address: hashchange.
  await page.evaluate((id) => { location.hash = `#${id}`; }, headingId);
  await expect.poll(async () => (await focused(page)).id).toBe(headingId);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");

  // 3. On load, the fragment is cleared after the browser has scrolled to it.
  await page.goto(`${postHref}#${headingId}`);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect.poll(() => page.locator(`#${headingId}`).evaluate((el) => Math.round(el.getBoundingClientRect().top)), { timeout: 10_000 }).toBeLessThan(400);

  // 4. Cross-page links to the home page's sections land on the section (it has tabindex="-1" already).
  await page.goto("/accessibility.html");
  await openMore(page, "Site");
  await page.getByRole("link", { name: "Lab" }).first().click();
  await expect.poll(() => page.evaluate(() => location.pathname)).toBe("/");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
});

test("choosing a typeface or theme keeps the chosen radio where it was on screen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Atkinson Hyperlegible Next" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const radio = (name: string) => page.getByRole("radio", { name, exact: true });
  const top = (name: string) => radio(name).evaluate((el) => Math.round(el.getBoundingClientRect().top));
  for (const name of ["Atkinson Hyperlegible Next", "System", "Public Sans", "Atkinson Hyperlegible Next", "Dark", "Light"]) {
    const before = await top(name);
    await radio(name).focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(600); // long enough for a font to arrive and the second correction to run
    expect(Math.abs((await top(name)) - before), `${name} stays put`).toBeLessThanOrEqual(1);
  }
});
