import { expect, test } from "@playwright/test";

const phoneViewports = [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

test("public mobile routes remain stable during repeated scrolling", async ({ page, browserName }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    const sample = { longTasks: [] as number[], shifts: [] as number[] };
    (window as typeof window & { __ggPerformanceSample?: typeof sample }).__ggPerformanceSample = sample;
    try {
      new PerformanceObserver((entries) => {
        sample.longTasks.push(...entries.getEntries().map((entry) => entry.duration));
      }).observe({ type: "longtask", buffered: true });
      new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) {
          const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!shift.hadRecentInput) sample.shifts.push(shift.value ?? 0);
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // WebKit may not expose both observer entry types in automation.
    }
  });

  for (const viewport of phoneViewports) {
    await page.setViewportSize(viewport);
    for (const route of ["/", "/marketplace", "/browse"]) {
      await test.step(`${route} at ${viewport.width}x${viewport.height}`, async () => {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.ok()).toBe(true);
        await page.locator("html[data-gg-hydrated='true']").waitFor();
        for (let index = 0; index < 4; index += 1) {
          if (browserName === "webkit") {
            await page.evaluate((distance) => window.scrollBy(0, distance), viewport.height * 0.7);
          } else {
            await page.mouse.wheel(0, viewport.height * 0.7);
          }
          await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
        }
        const result = await page.evaluate(() => {
          const sample = (window as typeof window & { __ggPerformanceSample?: { longTasks: number[]; shifts: number[] } }).__ggPerformanceSample;
          return {
            horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
            maxLongTask: Math.max(0, ...(sample?.longTasks ?? [])),
            cls: (sample?.shifts ?? []).reduce((sum, value) => sum + value, 0),
          };
        });
        expect(result.horizontalOverflow).toBeLessThanOrEqual(1);
        expect(result.maxLongTask).toBeLessThan(500);
        expect(result.cls).toBeLessThanOrEqual(0.1);
      });
    }
  }

  expect(pageErrors).toEqual([]);
});

test("Browse preloads its single mobile LCP image", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/browse", { waitUntil: "domcontentloaded" });

  await expect.poll(() => page.locator('link[rel="preload"][as="image"][imagesrcset*="browse-fresh-drops"]').count()).toBeGreaterThan(0);
  await expect(page.getByRole("img", { name: "Gaming handheld, headset, keyboard, controller, and games" })).toBeVisible();
});

test("anonymous public pages do not open Supabase Realtime", async ({ page }) => {
  const sockets: string[] = [];
  page.on("websocket", (socket) => sockets.push(socket.url()));

  await page.goto("/", { waitUntil: "networkidle" });

  expect(sockets.filter((url) => url.includes("/realtime/v1"))).toEqual([]);
});
