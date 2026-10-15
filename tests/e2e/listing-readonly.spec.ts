import { expect, test } from "@playwright/test";

test("mobile listing actions clear navigation and dialogs restore focus", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/marketplace");
  const listingHref = await page.locator('a[href^="/listing/"]').first().getAttribute("href");
  test.skip(!listingHref, "A public active listing is required for read-only layout verification");

  await page.goto(listingHref!);
  const mobileActions = page.locator('[data-listing-actions="mobile"]');
  await expect(mobileActions).toBeVisible();
  await expect(mobileActions).toHaveCSS("position", "fixed");
  const actions = await mobileActions.boundingBox();
  const navigation = await page.getByRole("navigation", { name: "Mobile navigation" }).boundingBox();
  expect(actions).toBeTruthy();
  expect(navigation).toBeTruthy();
  expect(actions!.y + actions!.height).toBeLessThanOrEqual(navigation!.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  const galleryTrigger = page.getByRole("button", { name: "Open full-screen gallery" });
  if (await galleryTrigger.count()) {
    await galleryTrigger.click();
    const gallery = page.getByRole("dialog", { name: /full-screen gallery/ });
    await expect(gallery).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(gallery).toBeHidden();
    await expect(galleryTrigger).toBeFocused();
  }

  const reportTrigger = page.getByRole("button", { name: "Report listing" });
  await reportTrigger.click();
  const report = page.getByRole("dialog", { name: "Report listing" });
  await expect(report).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(report).toBeHidden();
  await expect(reportTrigger).toBeFocused();
});
