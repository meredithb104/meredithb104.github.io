import { expect, test, type Page } from "@playwright/test";

/**
 * Things axe cannot see: where focus goes, whether it stays visible, and
 * whether every control can be reached and operated from the keyboard.
 */

async function focused(page: Page): Promise<{ tag: string; text: string; id: string; inView: boolean; unobscured: boolean }> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { tag: "body", text: "", id: "", inView: false, unobscured: false };
    const r = el.getBoundingClientRect();
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
    await expect.poll(async () => (f = await focused(page)).inView, { message: `${key} scrolled into view` }).toBe(true);
    expect(f.unobscured, `${key} not covered by the header`).toBe(true);
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
  await expect(page.getByRole("link", { name: "Live demo" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Read the case study" })).toHaveCount(2);
});

test("the contrast checker validates and describes errors in text", async ({ page }) => {
  await page.goto("/");
  const fg = page.getByLabel("Text color", { exact: true });
  await fg.fill("oops");
  await expect(fg).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#cc-fg-error")).toHaveText(/hex color/i);
  await fg.fill("#767676");
  await expect(fg).toHaveAttribute("aria-invalid", "false");
  await expect(page.locator(".contrast-result .ratio")).toHaveText(/4\.54:1/);
});
