import { expect, test } from "@playwright/test";

const mobileWidths = [320, 375, 390, 393, 430];
const desktopWidths = [768, 1024, 1280, 1440, 1920];

test("mobile first screen uses the interface-led hero without requesting hero photography", async ({ page }) => {
  const heroImageRequests: string[] = [];
  page.on("request", (request) => {
    if (/ggmarket-hero-(?:desktop|mobile)/.test(request.url())) heroImageRequests.push(request.url());
  });

  await page.setViewportSize({ width: mobileWidths[0], height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(heroImageRequests, "the retired wallpaper is not requested above the fold").toEqual([]);

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
    const globalHeader = page.locator("header.global-exchange-header");

    await expect(globalHeader).toHaveCount(1);
    await expect(globalHeader).toBeVisible();
    await expect.poll(async () => Math.round((await globalHeader.boundingBox())?.y ?? -1)).toBe(0);
    await expect(globalHeader.locator('[aria-label="GGMarket home"]:visible')).toHaveCount(1);
    await expect(globalHeader.getByRole("link", { name: /^Messages/ })).toHaveAttribute("href", "/messages");
    await expect(globalHeader.getByRole("button", { name: /^Notifications/ })).toBeVisible();
    await expect(hero.locator('[aria-label="GGMarket home"]')).toHaveCount(0);
    await expect(composition).toBeVisible();
    await expect(switchboard).toBeVisible();
    await expect(switchboard.locator("a")).toHaveCount(4);
    await expect(switchboard.getByRole("link", { name: "Accessories" })).toHaveAttribute("href", "/marketplace?category=peripherals");
    await expect(page.getByTestId("jellyfish-hero-background")).toBeVisible();
    await expect(hero.getByRole("button", { name: "Pause hero animation" })).toBeVisible();
    await expect(heading).toBeVisible();
    await expect(browse).toBeVisible();
    await expect(sell).toBeVisible();
    await expect(search).toBeVisible();
    expect(Number.parseFloat(await searchInput.evaluate((input) => getComputedStyle(input).fontSize))).toBeGreaterThanOrEqual(16);
    await expect(hero).toHaveJSProperty("scrollWidth", await hero.evaluate((element) => element.clientWidth));

    const searchBox = await search.boundingBox();
    expect(searchBox, `search has geometry at ${width}px`).not.toBeNull();
    expect(searchBox!.y + searchBox!.height, `search clears the mobile navigation at ${width}px`).toBeLessThan(766);

    await page.evaluate(() => window.scrollTo(0, Math.min(document.body.scrollHeight / 2, 900)));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(globalHeader).toBeVisible();
    await expect(globalHeader).toHaveCSS("position", "sticky");
    await expect.poll(async () => Math.round((await globalHeader.boundingBox())?.y ?? -1)).toBe(0);
    await expect(globalHeader.locator('[aria-label="GGMarket home"]:visible')).toHaveCount(1);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(globalHeader).toBeVisible();
    await expect.poll(async () => Math.round((await globalHeader.boundingBox())?.y ?? -1)).toBe(0);
    await expect(globalHeader.locator('[aria-label="GGMarket home"]:visible')).toHaveCount(1);
    await expect(hero).toHaveJSProperty("scrollWidth", await hero.evaluate((element) => element.clientWidth));
  }
});

test("mobile sticky header survives touch-like scroll down and back up", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "CDP touch input is Chromium-only; WebKit is covered by the responsive scroll test");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const header = page.locator("header.global-exchange-header");
  const session = await page.context().newCDPSession(page);

  const swipe = async (startY: number, endY: number) => {
    const x = 195;
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: startY }] });
    for (let step = 1; step <= 6; step += 1) {
      const y = startY + ((endY - startY) * step) / 6;
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };

  await swipe(700, 120);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(header).toBeVisible();
  await expect.poll(async () => Math.round((await header.boundingBox())?.y ?? -1)).toBe(0);
  await expect(header.locator('[aria-label="GGMarket home"]:visible')).toHaveCount(1);

  await swipe(140, 760);
  await swipe(140, 760);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(header).toBeVisible();
  await expect.poll(async () => Math.round((await header.boundingBox())?.y ?? -1)).toBe(0);
  await expect(header.locator('[aria-label="GGMarket home"]:visible')).toHaveCount(1);
  await expect(page.locator(".campaign-hero [aria-label='GGMarket home']")).toHaveCount(0);
});

test("desktop homepage uses the integrated procedural 3D hero", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hero = page.locator(".campaign-hero");
  const globalHeader = page.locator("header.global-exchange-header");
  await expect(globalHeader).toHaveCount(1);
  await expect(globalHeader.locator('[aria-label="GGMarket home"]:visible')).toHaveCount(1);
  await expect(hero.locator('[aria-label="GGMarket home"]')).toHaveCount(0);
  await expect(page.getByTestId("jellyfish-hero-background")).toBeVisible();
  await expect(page.getByTestId("mobile-hero-composition")).toBeHidden();
  await expect(page.getByTestId("category-switchboard")).toBeVisible();
  await expect(page.getByTestId("category-switchboard").locator("a")).toHaveCount(4);
  await expect(hero.getByRole("heading", { level: 1, name: "Find your next setup" })).toBeVisible();
  await expect(hero.getByRole("link", { name: /Browse marketplace/i })).toBeVisible();
  await expect(hero.getByRole("link", { name: /Sell your gear/i })).toBeVisible();
  await expect(hero.getByRole("search")).toBeVisible();
  await expect(hero.getByLabel("Search marketplace")).toBeEditable();
  await expect(hero.getByRole("button", { name: "Pause hero animation" })).toBeVisible();
  await hero.getByRole("button", { name: "Pause hero animation" }).click();
  await expect(hero.getByRole("button", { name: "Play hero animation" })).toBeVisible();

  for (const width of desktopWidths) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
    await expect(hero.getByRole("heading", { level: 1, name: "Find your next setup" })).toBeVisible();
    await expect(hero.getByRole("search")).toBeVisible();
    await expect(hero).toHaveJSProperty("scrollWidth", await hero.evaluate((element) => element.clientWidth));
  }
});
