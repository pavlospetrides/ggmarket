import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

test("public frontend routes fit every required responsive width", async ({ page }) => {
  test.setTimeout(300_000);

  await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
  const listingHref = await page.locator('a[href^="/listing/"]').first().getAttribute("href");
  let profileHref: string | null = null;
  if (listingHref) {
    await page.goto(listingHref, { waitUntil: "domcontentloaded" });
    profileHref = await page.locator('a[href^="/profile/"]').first().getAttribute("href");
  }

  const routes = [
    "/",
    "/marketplace",
    "/search?q=gaming",
    "/browse",
    ...(listingHref ? [listingHref] : []),
    "/login",
    "/sell",
    ...(profileHref ? [profileHref] : []),
    "/profile",
    "/settings",
    "/favorites",
    "/messages",
    "/saved-searches",
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect.soft(response?.ok(), `${route} should load at ${viewport.width}x${viewport.height}`).toBe(true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect.soft(overflow, `${route} horizontal overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
    }

    await page.goto("/");
    const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
    const desktopNav = page.getByRole("navigation", { name: "Main navigation" });
    if (viewport.width < 768) {
      await expect(mobileNav).toBeVisible();
      await expect(desktopNav).toBeHidden();
    } else {
      await expect(mobileNav).toBeHidden();
      await expect(desktopNav).toBeVisible();
    }
  }
});

test("mobile navigation and filter controls work at required phone sizes", async ({ page }) => {
  test.setTimeout(300_000);
  for (const [index, viewport] of viewports.slice(0, 6).entries()) {
    await test.step(`${viewport.width}x${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      if (index === 0) {
        await page.goto("/");
        await expect(page.getByRole("heading", { name: "Find your next setup" })).toBeVisible();
        const nav = page.getByRole("navigation", { name: "Mobile navigation" });
        await nav.getByRole("link", { name: "Browse" }).click();
        await expect(page).toHaveURL(/\/browse/);
        await expect(page.getByRole("heading", { name: "Find what plays next" })).toBeVisible();
      }
      await page.goto("/marketplace");

      const filtersButton = page.getByRole("button", { name: "Filters" });
      const filtersDialog = page.getByRole("dialog", { name: "Filters" });
      const filtersOverlay = page.getByTestId("sheet-overlay");
      await filtersButton.click();
      await expect(filtersDialog).toBeVisible();
      const closeFiltersButton = page.getByRole("button", { name: "Close filters" });
      await expect(closeFiltersButton).toBeFocused();
      await closeFiltersButton.click();
      await expect(filtersDialog).toBeHidden();
      await expect(filtersOverlay).toHaveCount(0);
      await expect(filtersButton).toBeFocused();

      await filtersButton.click();
      await page.keyboard.press("Escape");
      await expect(filtersDialog).toBeHidden();
      await expect(filtersOverlay).toHaveCount(0);
      await expect(filtersButton).toBeFocused();

      await filtersButton.click();
      await expect(filtersOverlay).toBeVisible();
      await filtersOverlay.click({ position: { x: 8, y: 8 } });
      await expect(filtersDialog).toBeHidden();
      await expect(filtersOverlay).toHaveCount(0);
    });
  }
});

test("exact game platform filters work at every required width", async ({ page }) => {
  test.setTimeout(300_000);
  for (const viewport of viewports) {
    await test.step(`${viewport.width}x${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto("/marketplace?category=games&q=metal+gear&condition=good");
      if (viewport.width < 768) await page.getByRole("button", { name: /^Filters/ }).click();
      const filters = viewport.width < 768
        ? page.getByRole("dialog", { name: "Filters" })
        : page.getByRole("complementary").filter({ hasText: "Filters" });

      await filters.getByLabel("Platform family").selectOption("playstation");
      await expect(page).toHaveURL(/family=playstation/);
      await expect(page).toHaveURL(/q=metal(?:\+|%20)gear/);
      await expect(page).toHaveURL(/condition=good/);
      const platform = filters.getByLabel("Console / Platform");
      await expect(platform).toBeVisible();
      await expect(platform.locator('option[value="ps5"]')).toHaveText("PlayStation 5");
      await expect(platform.locator('option[value="psp"]')).toHaveText("PlayStation Portable (PSP)");
      await expect(filters.getByText("Physical Format", { exact: true })).toHaveCount(0);

      await platform.selectOption("psp");
      await expect(page).toHaveURL(/platform=psp/);
      await expect(filters.getByLabel("Console / Platform")).toHaveValue("psp");
      const filterOverflow = await filters.evaluate((element) => element.scrollWidth - element.clientWidth);
      expect.soft(filterOverflow, `marketplace filter overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
      const [filterBox, platformBox] = await Promise.all([filters.boundingBox(), platform.boundingBox()]);
      expect.soft(platformBox?.x, `platform selector left edge at ${viewport.width}x${viewport.height}`).toBeGreaterThanOrEqual(filterBox?.x ?? 0);
      expect.soft((platformBox?.x ?? 0) + (platformBox?.width ?? 0), `platform selector right edge at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual((filterBox?.x ?? 0) + (filterBox?.width ?? viewport.width) + 1);
    });
  }
});
