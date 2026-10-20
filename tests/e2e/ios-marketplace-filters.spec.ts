import { expect, test } from "@playwright/test";

test.use({ hasTouch: true });

const phoneViewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
];

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page, expectedWidth: number) {
  const geometry = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    sort: (() => {
      const element = document.querySelector<HTMLSelectElement>('select[aria-label="Sort listings"]');
      const rect = element?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right } : null;
    })(),
  }));
  expect(geometry.viewport).toBe(expectedWidth);
  expect(geometry.document, `${expectedWidth}px document overflow`).toBeLessThanOrEqual(expectedWidth);
  expect(geometry.body, `${expectedWidth}px body overflow`).toBeLessThanOrEqual(expectedWidth);
  expect(geometry.sort?.left).toBeGreaterThanOrEqual(0);
  expect(geometry.sort?.right).toBeLessThanOrEqual(expectedWidth);
}

test("marketplace toolbar fits every supported phone width after hydration", async ({ page }) => {
  for (const viewport of phoneViewports) {
    await test.step(`${viewport.width}px`, async () => {
      await page.setViewportSize(viewport);
      await page.goto("/test-harness/marketplace", { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("data-gg-hydrated", "true", { timeout: 5_000 });
      await expectNoHorizontalOverflow(page, viewport.width);
      await expect(page.getByRole("combobox", { name: "Sort listings" })).toBeEnabled();
      await expect(page.getByRole("button", { name: /^Filters/ })).toBeEnabled();
    });
  }
});

test("mobile filter sheet accepts touch immediately after it becomes interactive", async ({ page }) => {
  test.setTimeout(180_000);

  for (const viewport of phoneViewports) {
    await test.step(`${viewport.width}px`, async () => {
      await page.setViewportSize(viewport);
      await page.goto("/marketplace", { waitUntil: "domcontentloaded" });

      const trigger = page.getByRole("button", { name: /^Filters/ });
      const dialog = page.getByRole("dialog", { name: "Filters" });
      await expect(trigger).toBeEnabled({ timeout: 5_000 });
      await trigger.scrollIntoViewIfNeeded();

      const hitTarget = await trigger.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return {
          matches: hit === element || element.contains(hit),
          trigger: { left: box.left, top: box.top, width: box.width, height: box.height },
          hit: hit ? `${hit.tagName.toLowerCase()}#${hit.id}.${hit.className}` : "none",
          viewport: { width: innerWidth, height: innerHeight },
        };
      });
      expect(hitTarget.matches, `${viewport.width}px trigger must not be covered by an overlay: ${JSON.stringify(hitTarget)}`).toBe(true);

      await trigger.tap({ timeout: 5_000 });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole("button", { name: "Close filters" })).toBeFocused();

      await page.getByRole("button", { name: "Close filters" }).tap();
      await expect(dialog).toBeHidden();
      await expect(page.getByTestId("sheet-overlay")).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect.poll(() => page.evaluate(() => ({
        overflow: document.body.style.overflow,
        pointerEvents: document.body.style.pointerEvents,
      }))).toEqual({ overflow: "", pointerEvents: "" });

      await trigger.tap({ timeout: 5_000 });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Condition").selectOption("good");
      await dialog.getByRole("button", { name: "Apply filters" }).tap();
      await expect(page).toHaveURL(/condition=good/);
    });
  }
});

test("mobile filters and sorting retain native outcomes when hydration is unavailable", async ({ browser, browserName }) => {
  test.skip(browserName !== "webkit", "The progressive fallback targets iOS Safari");
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  for (const viewport of phoneViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/test-harness/marketplace", { waitUntil: "domcontentloaded" });
    await expectNoHorizontalOverflow(page, viewport.width);
  }

  const sort = page.getByRole("combobox", { name: "Sort listings" });
  await expect(sort).toBeEnabled();
  await sort.selectOption("price-asc");
  await page.getByRole("button", { name: "Apply sort" }).tap();
  await expect(page).toHaveURL(/sort=price-asc/);

  await page.goto("/test-harness/marketplace", { waitUntil: "domcontentloaded" });
  const filters = page.locator("summary").filter({ hasText: "Filters" });
  await filters.tap();
  await expect(page.locator("#mobile-category")).toBeEnabled();
  await page.locator("#mobile-category").selectOption("games");
  await expect(page.getByLabel("Condition").filter({ visible: true })).toBeEnabled();
  await page.getByLabel("Condition").filter({ visible: true }).selectOption("good");
  await page.getByRole("button", { name: "Apply filters" }).filter({ visible: true }).tap();
  await expect(page).toHaveURL(/category=games/);
  await expect(page).toHaveURL(/condition=good/);
  await context.close();
});

test("mobile taxonomy filters preserve dependent state through touch navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marketplace?category=games&q=metal+gear", { waitUntil: "domcontentloaded" });

  const trigger = page.getByRole("button", { name: /^Filters/ });
  await expect(trigger).toBeEnabled({ timeout: 5_000 });
  await trigger.tap({ timeout: 5_000 });
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await dialog.getByLabel("Platform family").selectOption("playstation");
  await expect(page).toHaveURL(/family=playstation/);
  await expect(page).toHaveURL(/q=metal(?:\+|%20)gear/);
  await expect(dialog.getByLabel("Console \/ Platform")).toBeFocused();

  await dialog.getByLabel("Console / Platform").selectOption("ps5");
  await expect(page).toHaveURL(/platform=ps5/);
  await dialog.getByRole("link", { name: "Reset" }).tap();
  await expect(page).toHaveURL("/marketplace?q=metal+gear");
});

test("mobile PC hardware filters, history, chips, sorting, and clearing stay synchronized", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marketplace?category=pc-components&q=gaming", { waitUntil: "domcontentloaded" });

  const trigger = page.getByRole("button", { name: /^Filters/ });
  await expect(trigger).toBeEnabled({ timeout: 5_000 });
  await trigger.tap();
  const dialog = page.getByRole("dialog", { name: "Filters" });

  await dialog.getByLabel("Product type").selectOption("cpu");
  await expect(page).toHaveURL(/subcategory=cpu/);
  await expect(dialog.getByLabel("Processor manufacturer")).toBeFocused();

  await dialog.getByLabel("Processor manufacturer").selectOption("amd");
  await expect(page).toHaveURL(/manufacturer=amd/);
  await expect(dialog.getByLabel("Socket").locator('option[value^="lga"]')).toHaveCount(0);
  await dialog.getByLabel("Socket").selectOption("am5");
  await expect(page).toHaveURL(/socket=am5/);
  await expect(dialog.getByLabel("Processor family")).toBeFocused();

  await page.goBack();
  await expect(page).not.toHaveURL(/socket=am5/);
  await expect(dialog.getByLabel("Processor manufacturer")).toHaveValue("amd");
  await page.goForward();
  await expect(page).toHaveURL(/socket=am5/);

  await page.getByRole("button", { name: "Close filters" }).tap();
  await expect(trigger).toBeFocused();
  await page.getByRole("link", { name: /Remove socket filter/i }).tap();
  await expect(page).not.toHaveURL(/socket=/);

  await page.getByRole("combobox", { name: "Sort listings" }).selectOption("price-asc");
  await expect(page).toHaveURL(/sort=price-asc/);
  await page.getByRole("link", { name: "Clear all" }).tap();
  await expect(page).toHaveURL("/marketplace?q=gaming");
});
