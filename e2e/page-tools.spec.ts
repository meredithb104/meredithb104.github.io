import { expect, test } from "@playwright/test";

// Previous / Next / Top: hidden at the top of the page, present once past the hero, and every
// jump lands focus on the section (or the navigation) with the fragment cleared afterwards.
test("page tools appear past the hero, jump between sections, and return to the navigation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const tools = page.getByRole("navigation", { name: "Page" });
  await expect(tools).toBeHidden();

  // Scroll so the Work section's top sits at the reading line (scroll-padding puts it under the header).
  await page.evaluate(() => document.getElementById("work")!.scrollIntoView({ behavior: "instant" }));
  await expect(tools).toBeVisible();
  await expect(tools.getByRole("button", { name: "Previous section" })).not.toHaveAttribute("aria-disabled", "true");

  await tools.getByRole("button", { name: "Next section" }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("experience");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");

  await tools.getByRole("button", { name: "Previous section" }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("work");

  await tools.getByRole("link", { name: "Back to top" }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("sections-nav");
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect(tools).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "About" })).toBeFocused();
});

test("at the last section Next is inactive but still focusable and named", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.evaluate(() => document.getElementById("dictionary")!.scrollIntoView({ behavior: "instant" }));
  const next = page.getByRole("navigation", { name: "Page" }).getByRole("button", { name: "Next section" });
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await next.focus();
  await expect(next).toBeFocused();
});
