import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { mountLiveRegions } from "../lib/announce.ts";
import "../components/theme-picker.ts";
import "../components/contrast-checker.ts";
import "../components/work-filter.ts";
import "../components/site-nav.ts";
import "../components/tab-set.ts";
import "../components/carousel-slider.ts";

/**
 * Fast axe pass over the real source HTML in jsdom. Color contrast is
 * excluded here (jsdom has no layout or paint); the token build enforces
 * it, and e2e/a11y.spec.ts runs the full rule set in Chromium.
 */

function loadPage(file: string): void {
  const html = readFileSync(resolve(import.meta.dirname, "../..", file), "utf8");
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
  document.body.innerHTML = body;
  mountLiveRegions();
}

async function scan(): Promise<axe.AxeResults> {
  return axe.run(document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
}

const format = (v: axe.Result[]): string =>
  v.map((x) => `${x.id}: ${x.help}\n  ${x.nodes.map((n) => n.target.join(" ")).join("\n  ")}`).join("\n");

describe.each(["index.html", "accessibility.html"])("%s (jsdom axe)", (file) => {
  it("has no axe violations", async () => {
    loadPage(file);
    const results = await scan();
    expect(format(results.violations)).toBe("");
  });

  it("has exactly one h1 and a skip link first", () => {
    loadPage(file);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(document.body.firstElementChild?.matches("a.skip-link[href='#main']")).toBe(true);
    expect(document.getElementById("main")?.tabIndex).toBe(-1);
  });
});

describe("index.html structure", () => {
  it("every in-page nav link points at a focusable section", () => {
    loadPage("index.html");
    const links = [...document.querySelectorAll<HTMLAnchorElement>('site-nav a[href^="#"]')];
    expect(links.length).toBeGreaterThan(3);
    for (const a of links) {
      const target = document.getElementById(a.hash.slice(1));
      expect(target, a.hash).not.toBeNull();
      expect(target!.tabIndex, a.hash).toBe(-1);
    }
  });

  it("every SVG diagram has a title, a description, and a caption", () => {
    loadPage("index.html");
    const figures = [...document.querySelectorAll("figure.diagram")];
    expect(figures).toHaveLength(2);
    for (const f of figures) {
      const svg = f.querySelector("svg")!;
      expect(svg.getAttribute("role")).toBe("img");
      const ids = (svg.getAttribute("aria-labelledby") ?? "").split(" ");
      for (const id of ids) expect(svg.querySelector(`#${id}`)?.textContent?.trim().length).toBeGreaterThan(10);
      expect(f.querySelector("figcaption")?.textContent?.trim().length).toBeGreaterThan(40);
    }
  });

  it("decorative icons are hidden from assistive tech", () => {
    loadPage("index.html");
    for (const svg of document.querySelectorAll("a svg, button svg")) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
