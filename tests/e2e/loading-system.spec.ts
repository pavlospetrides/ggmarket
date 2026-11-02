import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 20_000 });

test("native route loading keeps navigation interactive and disappears with ready content", async ({ page }) => {
  await page.goto("/test-harness/loading", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-gg-hydrated", "true");
  await page.evaluate(() => {
    const state = { loaderExposed: false, navigationPresent: false, active: true };
    Object.assign(window, { __routeLoaderState: state });
    const inspect = () => {
      if (!state.active) return;
      const status = document.querySelector<HTMLElement>('[role="status"]');
      if (status) {
        const style = getComputedStyle(status);
        if (style.visibility !== "hidden" && Number(style.opacity) > 0) {
          state.loaderExposed = true;
          state.navigationPresent = Boolean(document.querySelector('nav[aria-label="Main navigation"] a[href="/marketplace"]'));
        }
      }
      requestAnimationFrame(inspect);
    };
    inspect();
  });

  await page.getByRole("link", { name: "Open delayed content" }).evaluate((link: HTMLAnchorElement) => link.click());

  const status = page.getByRole("status", { name: "Loading test content" });
  await expect(page.getByRole("heading", { name: "Delayed content is ready" })).toBeVisible();
  const observed = await page.evaluate(() => {
    const state = (window as typeof window & { __routeLoaderState: { loaderExposed: boolean; navigationPresent: boolean; active: boolean } }).__routeLoaderState;
    state.active = false;
    return state;
  });
  expect(observed.loaderExposed).toBe(true);
  expect(observed.navigationPresent).toBe(true);
  await expect(status).toHaveCount(0);
});

test("a prefetched fast route never exposes the delayed loader", async ({ page }) => {
  await page.goto("/test-harness/loading", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const state = { exposed: false, active: true };
    Object.assign(window, { __loaderVisibilityState: state });
    const inspect = () => {
      if (!state.active) return;
      const status = document.querySelector<HTMLElement>('[role="status"]');
      if (status) {
        const style = getComputedStyle(status);
        if (style.visibility !== "hidden" && Number(style.opacity) > 0) state.exposed = true;
      }
      requestAnimationFrame(inspect);
    };
    inspect();
  });

  await page.getByRole("link", { name: "Open immediate content" }).click();
  await expect(page.getByRole("heading", { name: "Immediate content is ready" })).toBeVisible();
  const exposed = await page.evaluate(() => {
    const state = (window as typeof window & { __loaderVisibilityState: { exposed: boolean; active: boolean } }).__loaderVisibilityState;
    state.active = false;
    return state.exposed;
  });
  expect(exposed).toBe(false);
});

test("an interrupted route transition removes its loading state", async ({ page }) => {
  await page.goto("/test-harness/loading", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Open delayed content" }).evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page.getByRole("status", { name: "Loading test content" })).toBeVisible();

  await page.goto("/test-harness/loading/immediate");

  await expect(page.getByRole("heading", { name: "Immediate content is ready" })).toBeVisible();
  await expect(page.locator('[role="status"][data-loader-size]')).toHaveCount(0);
});

test("settings and saved-search failures clear their compact pending feedback", async ({ page }) => {
  let releaseProfile!: () => void;
  const profileGate = new Promise<void>((resolve) => { releaseProfile = resolve; });
  let releaseSearch!: () => void;
  const searchGate = new Promise<void>((resolve) => { releaseSearch = resolve; });
  await page.route("**/api/profile", async (route) => {
    await profileGate;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Profile test unavailable" }) });
  });
  await page.route("**/api/saved-searches/alert-1", async (route) => {
    await searchGate;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Search test unavailable" }) });
  });
  await page.goto("/test-harness/loading/actions");
  await expect(page.locator("html")).toHaveAttribute("data-gg-hydrated", "true");

  await page.getByLabel("Display name").fill("Updated Test User");
  await page.getByRole("button", { name: "Save changes" }).click();
  const saving = page.getByRole("button", { name: "Saving…" });
  await expect(saving.locator('[data-loader-size="compact"]')).toBeVisible();
  releaseProfile();
  await expect(page.getByRole("alert").filter({ hasText: "Profile test unavailable" })).toBeVisible();
  await expect(saving).toHaveCount(0);

  await page.getByRole("button", { name: "Pause" }).click();
  const updatingSearch = page.locator('[role="status"][data-loader-size="compact"]', { hasText: "Updating saved search" });
  await expect(updatingSearch).toBeVisible();
  releaseSearch();
  await expect(page.getByRole("alert").filter({ hasText: "The alert could not be updated" })).toBeVisible();
  await expect(updatingSearch).toHaveCount(0);
});

test("all three SVG paths and both dot motions render without responsive overflow", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/api/notifications", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ notifications: [], unreadCount: 0 }),
    });
  });

  for (const viewport of [
    { label: "desktop", width: 1440, height: 900 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    await test.step(viewport.label, async () => {
      await page.setViewportSize(viewport);
      await page.goto("/test-harness/loading/preview", { waitUntil: "domcontentloaded" });
      const standard = page.getByRole("status", { name: "Standard loader preview" });
      await expect(standard).toBeVisible();
      await expect(standard.locator("svg")).toHaveCount(3);
      const motion = await standard.evaluate((element) => {
        const circle = element.querySelector("circle")!;
        const triangle = element.querySelector("polygon")!;
        const square = element.querySelector("rect")!;
        const triangleShape = element.querySelector<HTMLElement>('[data-loader-shape="triangle"]')!;
        const squareShape = element.querySelector<HTMLElement>('[data-loader-shape="square"]')!;
        return {
          circle: getComputedStyle(circle).animationName,
          triangle: getComputedStyle(triangle).animationName,
          square: getComputedStyle(square).animationName,
          triangleDot: getComputedStyle(triangleShape, "::before").animationName,
          squareDot: getComputedStyle(squareShape, "::before").animationName,
        };
      });
      expect(Object.values(motion).every((name) => name !== "none")).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({
        path: `artifacts/loading-system/${testInfo.project.name}-${viewport.label}.png`,
        fullPage: true,
      });
    });
  }

  expect(pageErrors).toEqual([]);
});

test("reduced motion keeps the three-shape mark visible without path or dot animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/test-harness/loading/preview", { waitUntil: "domcontentloaded" });
  const standard = page.getByRole("status", { name: "Standard loader preview" });
  await expect(standard).toBeVisible();
  const motion = await standard.evaluate((element) => {
    const animated = [...element.querySelectorAll("circle, polygon, rect")];
    const shapes = [...element.querySelectorAll<HTMLElement>('[data-loader-shape]')];
    return {
      paths: animated.map((node) => getComputedStyle(node).animationName),
      dots: shapes.map((node) => getComputedStyle(node, "::before").animationName),
    };
  });
  expect(motion.paths).toEqual(["none", "none", "none"]);
  expect(motion.dots).toEqual(["none", "none", "none"]);
  await expect(standard.locator("svg")).toHaveCount(3);
});
