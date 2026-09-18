import { expect, test } from "@playwright/test";

// The hydrangeas are decoration: they may never sit on text or a control, at any width, font size,
// or zoom where they show, and they must be absent from the accessibility tree and the tab order.
const SETUPS = [
  { width: 1152, fontSize: 16, name: "72em at 16px" },
  { width: 1280, fontSize: 20, name: "1280px at 20px" },
  { width: 1920, fontSize: 18, name: "1920px at 18px" },
];

for (const setup of SETUPS) {
  test(`no hydrangea overlaps text or a control: ${setup.name}`, async ({ page }) => {
    await page.setViewportSize({ width: setup.width, height: 1000 });
    await page.goto("/");
    await page.addStyleTag({ content: `html{font-size:${setup.fontSize}px}` });
    await page.waitForTimeout(200);
    const result = await page.evaluate(() => {
      const blooms = [...document.querySelectorAll<HTMLElement>(".hydrangea")]
        .filter((b) => getComputedStyle(b).display !== "none")
        .map((b) => b.getBoundingClientRect());
      const content = [...document.querySelectorAll<HTMLElement>("main p, main h1, main h2, main h3, main li, main dt, main dd, main a, main button, main input, main label, main table, main figure")];
      const hits = new Set<string>();
      for (const b of blooms) {
        for (const el of content) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) hits.add(el.textContent!.trim().slice(0, 40));
        }
      }
      return { blooms: blooms.length, hits: [...hits] };
    });
    expect(result.blooms, "the blooms show at this width").toBe(5);
    expect(result.hits, "content a bloom sits on").toEqual([]);
  });
}

test("the hydrangeas are outside the accessibility tree and the tab order, and gone at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const facts = await page.evaluate(() => {
    const blooms = [...document.querySelectorAll<HTMLElement>(".hydrangea, .hydrangea-sprite")];
    return {
      count: blooms.length,
      hidden: blooms.every((b) => b.getAttribute("aria-hidden") === "true"),
      unfocusable: blooms.every((b) => b.getAttribute("focusable") === "false" && !b.hasAttribute("tabindex")),
      noPointer: blooms.filter((b) => b.classList.contains("hydrangea")).every((b) => getComputedStyle(b).pointerEvents === "none"),
    };
  });
  expect(facts.count).toBe(6);
  expect(facts.hidden).toBe(true);
  expect(facts.unfocusable).toBe(true);
  expect(facts.noPointer).toBe(true);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".hydrangea")].every((b) => getComputedStyle(b).display === "none"))).toBe(true);
});
