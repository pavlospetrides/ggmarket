import { expect, test, type TestInfo } from "@playwright/test";

async function activate(target: ReturnType<import("@playwright/test").Page["getByRole"]>, testInfo: TestInfo) {
  if (testInfo.project.name === "webkit") await target.tap();
  else await target.click();
}

test("mobile listing actions clear navigation and dialogs restore focus", async ({ page }, testInfo) => {
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

  const galleryTrigger = page.getByRole("link", { name: "Open full-screen gallery" });
  if (await galleryTrigger.count()) {
    await activate(galleryTrigger, testInfo);
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

test("gallery controls change the displayed image and swipe advances it", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marketplace");
  const listingHref = await page.locator('a[href^="/listing/"]').first().getAttribute("href");
  test.skip(!listingHref, "A public active listing is required for gallery verification");
  await page.goto(listingHref!);

  const gallery = page.locator("[data-gallery-index]").first();
  const next = gallery.getByRole("button", { name: "Next image" });
  test.skip(await next.count() === 0, "A public listing with multiple images is required");
  const initialSrc = await gallery.locator("img").first().getAttribute("src");

  await activate(next, testInfo);
  await expect(gallery).toHaveAttribute("data-gallery-index", "1");
  await expect.poll(() => gallery.locator("img").first().getAttribute("src")).not.toBe(initialSrc);

  await gallery.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", clientX: 300, clientY: 300, button: 0, isPrimary: true });
  await gallery.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 300, button: 0, isPrimary: true });
  await expect(gallery).toHaveAttribute("data-gallery-index", "2");
});
