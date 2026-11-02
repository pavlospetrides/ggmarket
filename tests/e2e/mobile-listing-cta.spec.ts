import { expect, test } from "@playwright/test";

const phoneWidths = [320, 360, 375, 390, 414, 430];

test("mobile document clearance follows the rendered navigation height", async ({ page }) => {
  for (const width of phoneWidths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/test-harness/marketplace");

      const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
      await expect(navigation).toBeVisible();
      const [navigationBox, linkBoxes, viewportHeight, bodyPadding] = await Promise.all([
        navigation.boundingBox(),
        navigation.getByRole("link").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().toJSON())),
        page.evaluate(() => innerHeight),
        page.evaluate(() => Number.parseFloat(getComputedStyle(document.body).paddingBottom)),
      ]);

      expect(navigationBox).toBeTruthy();
      const overlayTop = Math.min(navigationBox!.y, ...linkBoxes.map((box) => box.y));
      const fixedFootprint = viewportHeight - overlayTop;
      expect(bodyPadding + 0.1).toBeGreaterThanOrEqual(fixedFootprint);
      expect(bodyPadding - fixedFootprint).toBeLessThanOrEqual(8);
      for (const link of await navigation.getByRole("link").all()) {
        const box = await link.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
        expect(box?.width).toBeGreaterThanOrEqual(44);
      }
    });
  }
});

test("seller chat remains in flow and long content reaches the footer at every phone width", async ({ page }) => {
  for (const width of phoneWidths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/test-harness/message-seller");

      const seller = page.getByRole("region", { name: "Seller information" });
      const button = seller.getByRole("button", { name: "Message seller", exact: true });
      await expect(page.locator('[data-listing-actions="mobile"]')).toHaveCount(0);
      await expect(button).toBeVisible();
      await expect(button).not.toHaveCSS("position", "fixed");
      const buttonBox = await button.boundingBox();
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const [footerBox, navigationBox, navigationLinkBoxes] = await Promise.all([
        page.locator("[data-site-footer]").boundingBox(),
        page.getByRole("navigation", { name: "Mobile navigation" }).boundingBox(),
        page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().toJSON())),
      ]);
      expect(footerBox).toBeTruthy();
      expect(navigationBox).toBeTruthy();
      const navigationTop = Math.min(navigationBox!.y, ...navigationLinkBoxes.map((box) => box.y));
      expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(navigationTop + 1);
    });
  }
});

test("desktop keeps one compact in-flow seller chat action", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/test-harness/message-seller");

  const seller = page.getByRole("region", { name: "Seller information" });
  const button = seller.getByRole("button", { name: "Message seller", exact: true });
  await expect(page.getByRole("button", { name: "Message seller", exact: true })).toHaveCount(1);
  await expect(button).toBeVisible();
  await expect(button).not.toHaveCSS("position", "fixed");
  const box = await button.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
