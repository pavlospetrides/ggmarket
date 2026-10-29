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
test("listing action clears navigation and the footer at every phone width", async ({ page }) => {
  for (const width of phoneWidths) {
    await test.step(`${width}px`, async () => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/test-harness/mobile-fixed-stack");

      const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
      const action = page.locator('[data-listing-actions="mobile"]');
      const button = action.getByRole("button", { name: "Message seller" });
      await expect(action).toBeVisible();
      await expect(button).toBeVisible();

      const [actionBox, navigationBox, navigationLinkBoxes, buttonBox] = await Promise.all([
        action.boundingBox(),
        navigation.boundingBox(),
        navigation.getByRole("link").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().toJSON())),
        button.boundingBox(),
      ]);
      expect(actionBox).toBeTruthy();
      expect(navigationBox).toBeTruthy();
      const navigationTop = Math.min(navigationBox!.y, ...navigationLinkBoxes.map((box) => box.y));
      expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(navigationTop);
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);

      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const [footerBox, actionAtEnd, overflow] = await Promise.all([
        page.locator("[data-site-footer]").boundingBox(),
        action.boundingBox(),
        page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      ]);
      expect(footerBox).toBeTruthy();
      expect(actionAtEnd).toBeTruthy();
      expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(actionAtEnd!.y + 1);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});

