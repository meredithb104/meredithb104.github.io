import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * axe-core against the production build in real Chromium, with layout and
 * paint, so color-contrast and target-size rules actually run. Every page in
 * every theme, including the automatic dark theme via prefers-color-scheme.
 */

const PAGES = ["/", "/accessibility.html"] as const;
const THEMES = ["auto", "light", "dark", "high-contrast"] as const;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function open(page: Page, path: string, theme: (typeof THEMES)[number]): Promise<void> {
  if (theme === "auto") await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript((t) => {
    if (t === "auto") localStorage.removeItem("theme");
    else localStorage.setItem("theme", t);
  }, theme);
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

function describe(results: Awaited<ReturnType<AxeBuilder["analyze"]>>): string {
  return results.violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n  ${v.helpUrl}\n  ${v.nodes
          .map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n").join(" ")}`)
          .join("\n  ")}`,
    )
    .join("\n\n");
}

for (const path of PAGES) {
  for (const theme of THEMES) {
    test(`${path} has no axe violations in the ${theme} theme`, async ({ page }) => {
      await open(page, path, theme);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(describe(results), describe(results)).toBe("");
    });
  }
}

test("filtering the work grid keeps the page violation-free", async ({ page }) => {
  await open(page, "/", "light");
  await page.getByRole("button", { name: "back end" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Showing" })).toHaveText(/Showing 2 of 5/);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(describe(results), describe(results)).toBe("");
});

test("a failing contrast pair in the checker is still an accessible page", async ({ page }) => {
  await open(page, "/", "light");
  await page.getByLabel("Text color", { exact: true }).fill("#777777");
  await expect(page.locator(".contrast-result .fail").first()).toHaveText("Fail");
  // The preview swatch renders exactly the pair the visitor typed, so it fails when they do.
  // That is its job (and it is aria-hidden; the verdict lives in the table). Documented in the
  // accessibility statement. Everything else on the page must still pass.
  const results = await new AxeBuilder({ page }).withTags(TAGS).exclude(".swatch").analyze();
  expect(describe(results), describe(results)).toBe("");
});
