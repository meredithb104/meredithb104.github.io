import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Rendered contrast, not declared contrast. The token build proves the pairs
 * tokens declare; this proves what the browser draws: the focus ring against
 * the color it actually borders, controls in hover and selected states, and
 * axe's contrast rule on a phone-width page with every state driven.
 */

function lum([r, g, b]: number[]): number {
  const f = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
}
function ratio(a: number[], b: number[]): number { const [x, y] = [lum(a), lum(b)].toSorted((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); }

const THEMES = ["light", "dark", "high-contrast"] as const;

for (const theme of THEMES) {
  test(`${theme}: focus ring reaches 3:1 against what it borders, for every focusable kind`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const rings = await page.evaluate(() => {
      const toRgb = (s: string) => { const c = document.createElement("canvas").getContext("2d")!; c.fillStyle = s; const h = c.fillStyle as string; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
      const bgOf = (e0: Element | null) => { let e = e0; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return toRgb(c); e = e.parentElement; } return [255, 255, 255]; };
      const ring = toRgb(getComputedStyle(document.documentElement).getPropertyValue("--color-focus").trim());
      const out: { kind: string; ring: number[]; adjacent: number[] }[] = [];
      const seen = new Set<string>();
      for (const el of document.querySelectorAll<HTMLElement>("a[href], button, input, [tabindex='0']")) {
        if (el.offsetParent === null && !el.matches(".cui-skip-link")) continue;
        const cs = getComputedStyle(el);
        const offset = parseFloat(cs.outlineOffset);
        // A ring outside the box (offset >= 0) borders the parent's background; inside, the element's own.
        const adjacent = offset >= 0 || cs.backgroundColor === "rgba(0, 0, 0, 0)" ? bgOf(el.parentElement) : toRgb(cs.backgroundColor);
        const kind = `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}@${adjacent.join(",")}`;
        if (seen.has(kind)) continue;
        seen.add(kind);
        out.push({ kind, ring, adjacent });
      }
      return out;
    });
    expect(rings.length).toBeGreaterThan(8);
    const bad = rings.map((r) => ({ ...r, ratio: ratio(r.ring, r.adjacent) })).filter((r) => r.ratio < 3);
    expect(bad, JSON.stringify(bad)).toEqual([]);
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: controls keep text at 4.5:1 and a 3:1 boundary in default, hover, pressed, and selected states`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await page.goto("/");
    await page.getByLabel("Text color", { exact: true }).fill("#767676");
    await page.getByRole("button", { name: "back end" }).click();
    await page.getByRole("button", { name: "Menu" }).click();

    const controls = [
      "a.cui-button--primary", "a.cui-button--secondary", "button.cui-menu-button",
      ".chip[aria-pressed='true']", ".chip[aria-pressed='false']", ".carousel-button",
      ".carousel-dot[aria-selected='true']", ".carousel-dot[aria-selected='false']",
    ];
    const failures: string[] = [];
    for (const sel of controls) {
      const loc = page.locator(sel).first();
      for (const state of ["default", "hover"] as const) {
        if (state === "hover") await loc.hover(); else await page.mouse.move(0, 0);
        await page.waitForTimeout(120);
        const m = await loc.evaluate((el) => {
          const toRgb = (s: string) => { const c = document.createElement("canvas").getContext("2d")!; c.fillStyle = s; const h = c.fillStyle as string; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
          const bgOf = (e0: Element | null) => { let e = e0; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return toRgb(c); e = e.parentElement; } return [255, 255, 255]; };
          const cs = getComputedStyle(el);
          const own = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent" ? toRgb(cs.backgroundColor) : null;
          const surround = bgOf(el.parentElement);
          return { fg: toRgb(cs.color), bg: own ?? surround, own, surround, border: toRgb(cs.borderTopColor), bw: parseFloat(cs.borderTopWidth), text: (el.textContent ?? "").trim() };
        });
        const textR = m.text ? ratio(m.fg, m.bg) : Infinity;
        const boundary = Math.max(m.own ? ratio(m.own, m.surround) : 0, m.bw > 0 ? ratio(m.border, m.surround) : 0);
        if (textR < 4.5 || boundary < 3) failures.push(`${sel} ${state}: text ${textR.toFixed(2)}, boundary ${boundary.toFixed(2)}`);
      }
    }
    expect(failures).toEqual([]);

    // The selected-tab and current-section underlines are state indicators: 3:1 against their surroundings.
    const underline = await page.evaluate(() => {
      const toRgb = (s: string) => { const c = document.createElement("canvas").getContext("2d")!; c.fillStyle = s; const h = c.fillStyle as string; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
      const bgOf = (e0: Element | null) => { let e = e0; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return toRgb(c); e = e.parentElement; } return [255, 255, 255]; };
      const tab = document.querySelector<HTMLElement>(".cui-tabs__tab[aria-selected='true']")!;
      return { line: toRgb(getComputedStyle(tab).borderBottomColor), surround: bgOf(tab.parentElement) };
    });
    expect(ratio(underline.line, underline.surround)).toBeGreaterThanOrEqual(3);

    // Pass and Fail pills: text 4.5:1 on the fill, and a 3:1 boundary (border) against the card.
    const pills = await page.evaluate(() => {
      const toRgb = (s: string) => { const c = document.createElement("canvas").getContext("2d")!; c.fillStyle = s; const h = c.fillStyle as string; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
      const bgOf = (e0: Element | null) => { let e = e0; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return toRgb(c); e = e.parentElement; } return [255, 255, 255]; };
      return [".contrast-result .pass", ".contrast-result .fail"].map((sel) => { const el = document.querySelector<HTMLElement>(sel)!; const cs = getComputedStyle(el); return { sel, fg: toRgb(cs.color), fill: toRgb(cs.backgroundColor), border: toRgb(cs.borderTopColor), bw: parseFloat(cs.borderTopWidth), surround: bgOf(el.parentElement) }; });
    });
    for (const p of pills) {
      expect(ratio(p.fg, p.fill), `${p.sel} text`).toBeGreaterThanOrEqual(4.5);
      expect(p.bw, `${p.sel} has a border`).toBeGreaterThan(0);
      expect(ratio(p.border, p.surround), `${p.sel} boundary`).toBeGreaterThanOrEqual(3);
    }

    // Diagram store boxes: axe does not measure SVG text, so measure it here. Label 7:1, sublabel 4.5:1 on the box fill.
    const store = await page.evaluate(() => {
      const toRgb = (s: string) => { const c = document.createElement("canvas").getContext("2d")!; c.fillStyle = s; const h = c.fillStyle as string; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
      const svg = document.querySelector("svg.diagram-narrow")!;
      const box = svg.querySelector(".box--store")!;
      return { fill: toRgb(getComputedStyle(box).fill), stroke: toRgb(getComputedStyle(box).stroke), label: toRgb(getComputedStyle(svg.querySelector(".label--store")!).fill), sub: toRgb(getComputedStyle(svg.querySelector(".sublabel--store")!).fill), page: toRgb(getComputedStyle(document.querySelector(".diagram")!).backgroundColor) };
    });
    expect(ratio(store.label, store.fill)).toBeGreaterThanOrEqual(7);
    expect(ratio(store.sub, store.fill)).toBeGreaterThanOrEqual(4.5);
    // 1.4.11: the box is identifiable if its fill or its stroke reaches 3:1 against the diagram background.
    expect(Math.max(ratio(store.fill, store.page), ratio(store.stroke, store.page)), "store box boundary").toBeGreaterThanOrEqual(3);

    const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    expect(results.violations).toEqual([]);
  });
}
