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
