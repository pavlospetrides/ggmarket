import { expect, test } from "@playwright/test";

const mobileWidths = [320, 375, 390, 393, 430];

test("mobile first screen uses the interface-led hero without requesting hero photography", async ({ page }) => {
  const heroImageRequests: string[] = [];
  page.on("request", (request) => {
    if (/ggmarket-hero-(?:desktop|mobile)/.test(request.url())) heroImageRequests.push(request.url());
  });

  await page.setViewportSize({ width: mobileWidths[0], height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  for (const width of mobileWidths) {
    await page.setViewportSize({ width, height: 844 });

    const hero = page.locator(".campaign-hero");
    const composition = page.getByTestId("mobile-hero-composition");
    const switchboard = page.getByTestId("mobile-category-switchboard");
    const heading = page.getByRole("heading", { level: 1, name: "Find your next setup" });
    const browse = hero.getByRole("link", { name: /Browse marketplace/i });
    const sell = hero.getByRole("link", { name: /Sell your gear/i });
    const search = hero.getByRole("search");
    const searchInput = hero.getByLabel("Search marketplace");

    await expect(composition).toBeVisible();
    await expect(switchboard).toBeVisible();
    await expect(switchboard.locator("a")).toHaveCount(4);
    await expect(switchboard.getByRole("link", { name: "Accessories" })).toHaveAttribute("href", "/marketplace?category=peripherals");
    await expect(page.locator(".campaign-hero-art")).toBeHidden();
    await expect(heading).toBeVisible();
    await expect(browse).toBeVisible();
    await expect(sell).toBeVisible();
    await expect(search).toBeVisible();
    expect(Number.parseFloat(await searchInput.evaluate((input) => getComputedStyle(input).fontSize))).toBeGreaterThanOrEqual(16);
    await expect(hero).toHaveJSProperty("scrollWidth", await hero.evaluate((element) => element.clientWidth));

    const searchBox = await search.boundingBox();
    expect(searchBox, `search has geometry at ${width}px`).not.toBeNull();
    expect(searchBox!.y + searchBox!.height, `search clears the mobile navigation at ${width}px`).toBeLessThan(766);
  }

  expect(heroImageRequests).toEqual([]);
});

test("desktop homepage retains the approved photographic hero", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hero = page.locator(".campaign-hero");
  await expect(page.locator(".campaign-hero-art")).toBeVisible();
  await expect(page.getByTestId("mobile-hero-composition")).toBeHidden();
  await expect(page.getByTestId("category-switchboard")).toBeVisible();
  await expect(page.getByTestId("category-switchboard").locator("a")).toHaveCount(4);
  await expect(hero.getByRole("heading", { level: 1, name: "Find your next setup" })).toBeVisible();
  await expect(hero.getByRole("link", { name: /Browse marketplace/i })).toBeVisible();
  await expect(hero.getByRole("link", { name: /Sell your gear/i })).toBeVisible();
  await expect(hero.getByRole("search")).toBeVisible();
  await expect(hero.getByLabel("Search marketplace")).toBeEditable();
  const desktopImage = page.locator(".campaign-hero-art img");
  await expect.poll(() => desktopImage.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain("ggmarket-hero-desktop.webp");
  await expect.poll(() => desktopImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(1);
});
