import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, serviceWorkers: "block" });
test.skip(process.env.E2E_UI_HARNESS !== "1", "Safe Sell UI harness is opt-in and never uses the configured Supabase project.");

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("Sell wizard accepts touch through every step and recovers from a mocked publish error", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/listings", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "Test publish unavailable" }),
  }));
  await page.goto("/test-harness/sell", { waitUntil: "domcontentloaded" });

  const form = page.locator('form[data-hydrated]');
  await expect(form).toHaveAttribute("data-hydrated", "true", { timeout: 5_000 });
  const next = page.getByRole("button", { name: "Next", exact: true });
  await expect(next).toBeDisabled();

  const games = page.getByRole("button", { name: "Games", exact: true });
  await games.tap();
  await expect(games).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('input[name="categoryId"]')).toHaveValue("11111111-1111-4111-8111-111111111111");
  await page.getByLabel("Platform family").selectOption("playstation");
  await page.getByLabel("Console / Platform").selectOption("ps5");
  await expect(next).toBeEnabled();
  await next.scrollIntoViewIfNeeded();
  const actionGeometry = await page.evaluate(() => {
    const nextButton = [...document.querySelectorAll("button")].find((button) => button.textContent?.trim().startsWith("Next"));
    const navigation = document.querySelector<HTMLElement>('nav[aria-label="Mobile navigation"]');
    const action = nextButton?.getBoundingClientRect();
    const nav = navigation?.getBoundingClientRect();
    return { actionBottom: action?.bottom, navigationTop: nav?.top };
  });
  expect(actionGeometry.actionBottom).toBeLessThanOrEqual(actionGeometry.navigationTop ?? 844);
  await next.tap();
  await expect(page.getByRole("heading", { name: "Which product or model?" })).toBeVisible();

  await page.getByLabel("Product or model").fill("PlayStation 5 Slim");
  await page.getByRole("button", { name: "Back" }).tap();
  await expect(games).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Console / Platform")).toHaveValue("ps5");
  await next.tap();
  await expect(page.getByLabel("Product or model")).toHaveValue("PlayStation 5 Slim");
  await next.tap();

  await page.locator('input[type="file"]').setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: png },
    { name: "two.png", mimeType: "image/png", buffer: png },
  ]);
  await expect(page.getByRole("button", { name: /Remove photo/ })).toHaveCount(2);
  await page.getByRole("button", { name: "Remove photo 1" }).tap();
  await expect(page.getByRole("button", { name: /Remove photo/ })).toHaveCount(1);
  await next.tap();

  await page.getByLabel("Listing title").fill("Touch test PlayStation 5");
  await page.getByLabel("Description").fill("A");
  await page.getByLabel("Condition").selectOption("like_new");
  await next.tap();

  await page.getByLabel(/^Price/).fill("450");
  await page.getByLabel("Location").fill("Test City");
  await page.getByRole("button", { name: "Back" }).tap();
  await expect(page.getByLabel("Listing title")).toHaveValue("Touch test PlayStation 5");
  await next.tap();
  await expect(page.getByLabel(/^Price/)).toHaveValue("450");
  await next.tap();

  await expect(page.getByRole("heading", { name: "Ready to publish?" })).toBeVisible();
  await expect(page.getByText("PlayStation 5", { exact: true })).toBeVisible();
  const publish = page.getByRole("button", { name: "Publish", exact: true });
  await publish.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `.taste-skill/ios-functional-audit/${testInfo.project.name}-390-sell-preview.png`,
    fullPage: true,
    animations: "disabled",
  });
  await publish.tap();
  await expect(page.locator("p:not(.sr-only)", { hasText: "Test publish unavailable" })).toBeVisible();
  await expect(publish).toBeEnabled();
});

test("Sell PC Hardware dependent selectors reset incompatible values on touch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-harness/sell", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated]')).toHaveAttribute("data-hydrated", "true", { timeout: 5_000 });

  const pcComponents = page.getByRole("button", { name: "PC Components", exact: true });
  await pcComponents.tap();
  await expect(pcComponents).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Product type").selectOption("cpu");
  await page.getByRole("button", { name: "Next", exact: true }).tap();
  await page.getByLabel("Product or model").fill("Test CPU");
  await page.getByLabel("Processor manufacturer").selectOption("amd");
  await page.getByLabel("Socket").selectOption("am5");
  await page.getByLabel("Processor family").selectOption("ryzen-7");
  await page.getByLabel("Generation / series").selectOption("ryzen-7000");
  await page.getByLabel("Processor model").selectOption("ryzen-7-7800x3d");

  await page.getByLabel("Processor manufacturer").selectOption("intel");
  await expect(page.getByLabel("Socket")).toHaveValue("");
  await expect(page.getByLabel("Processor family")).toHaveCount(0);
  await expect(page.getByLabel("Socket").locator('option[value="am5"]')).toHaveCount(0);
});

test("Edit Listing touch controls preserve data and recover from mocked request failures", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/listings/33333333-3333-4333-8333-333333333333", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "Test update unavailable" }),
  }));
  await page.route("**/api/listing-images/**", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "Test image removal unavailable" }),
  }));
  await page.goto("/test-harness/edit", { waitUntil: "domcontentloaded" });

  const form = page.locator('form[data-hydrated]');
  await expect(form).toHaveAttribute("data-hydrated", "true", { timeout: 5_000 });
  await expect(page.getByLabel("Title")).toHaveValue("Existing test listing");
  await expect(page.getByLabel("Console / Platform")).toHaveValue("ps5");

  await page.getByLabel("Title").fill("Updated test listing");
  await page.getByLabel("Description").fill("A");
  const save = page.getByRole("button", { name: "Save changes" });
  await save.tap();
  await expect(page.getByText("Test update unavailable", { exact: true })).toBeVisible();
  await expect(save).toBeEnabled();
  await expect(page.getByLabel("Title")).toHaveValue("Updated test listing");

  await page.getByRole("button", { name: "Delete photo" }).first().tap();
  await expect(page.getByText("Test image removal unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete photo" }).first()).toBeEnabled();
});

