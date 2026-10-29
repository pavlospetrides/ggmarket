import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });
test.skip(process.env.E2E_UI_HARNESS !== "1", "Safe Sell UI harness is opt-in and never uses the configured Supabase project.");

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function finishWizard(page: Page, title: string) {
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await page.locator('input[type="file"]').setInputFiles({ name: "listing.png", mimeType: "image/png", buffer: png });
  await next.click();
  await page.getByLabel("Listing title").fill(title);
  await page.getByLabel("Description").fill("Deterministic specification mapping regression fixture.");
  await page.getByLabel("Condition").selectOption("good");
  await next.click();
  await page.getByLabel(/^Price/).fill("500");
  await page.getByLabel("Location").fill("Test City");
  await next.click();
  await expect(page.getByRole("heading", { name: "Ready to publish?" })).toBeVisible();
}

test("Gaming PC category changes cannot leak PEGI into RAM, preview, or draft payload", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/listings", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Captured safe test draft" }) });
  });
  await page.goto("/test-harness/sell", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByLabel("Platform family").selectOption("playstation");
  await page.getByLabel("Console / Platform").selectOption("ps5");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Product or model").fill("Game before category switch");
  await page.getByLabel("PEGI").selectOption("16");
  await page.getByRole("button", { name: "Back" }).click();

  await page.getByRole("button", { name: "Gaming PCs", exact: true }).click();
  await page.getByLabel("Product type").selectOption("complete-gaming-pc");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByLabel("PEGI")).toHaveCount(0);
  await page.getByLabel("Product or model").fill("Custom Ryzen Gaming PC");
  await page.getByLabel("Processor").fill("Ryzen 7 7800X3D");
  await page.getByLabel("Graphics card").fill("RTX 4070");
  await page.getByLabel("RAM").fill("16 GB");
  await page.getByLabel("Storage").fill("1 TB NVMe");
  await finishWizard(page, "Gaming PC mapping test");

  const specifications = page.getByRole("heading", { name: "Preview specifications" }).locator("..");
  await expect(specifications.getByText("RAM", { exact: true })).toBeVisible();
  await expect(specifications.getByText("16 GB", { exact: true })).toBeVisible();
  await expect(specifications.getByText(/PEGI/)).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("gaming-pc-preview.png"), fullPage: true, animations: "disabled" });

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator("p:not(.sr-only)", { hasText: "Captured safe test draft" })).toBeVisible();
  expect(submitted).toBeDefined();
  expect(submitted?.attributes).toEqual({
    taxonomy_version: "1",
    subcategory: "complete-gaming-pc",
    cpu: "Ryzen 7 7800X3D",
    gpu: "RTX 4070",
    ram: "16 GB",
    storage: "1 TB NVMe",
    intent: "sale",
  });
});

test("Game PEGI remains category-specific from six-step preview through draft payload", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/listings", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Captured safe test draft" }) });
  });
  await page.goto("/test-harness/sell", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  await page.getByRole("button", { name: "Games", exact: true }).click();
  await page.getByLabel("Platform family").selectOption("playstation");
  await page.getByLabel("Console / Platform").selectOption("ps5");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Product or model").fill("PEGI game fixture");
  await page.getByLabel("Genre").selectOption("action");
  await page.getByLabel("PEGI").selectOption("16");
  await finishWizard(page, "Game PEGI mapping test");

  const specifications = page.getByRole("heading", { name: "Preview specifications" }).locator("..");
  await expect(specifications.getByText("PEGI", { exact: true })).toBeVisible();
  await expect(specifications.getByText("16", { exact: true })).toBeVisible();
  await expect(specifications.getByText("RAM", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("game-pegi-preview.png"), fullPage: true, animations: "disabled" });

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator("p:not(.sr-only)", { hasText: "Captured safe test draft" })).toBeVisible();
  expect(submitted?.attributes).toMatchObject({ pegi: "16", genre: "action", platform: "ps5" });
  expect(submitted?.attributes).not.toHaveProperty("ram");
});

test("editing a restored Gaming PC draft preserves RAM and never creates a PEGI field", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-harness/edit?fixture=gaming-pc", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  await expect(page.getByLabel("Category")).toHaveValue("77777777-7777-4777-8777-777777777777");
  await expect(page.getByLabel("Product type")).toHaveValue("complete-gaming-pc");
  await expect(page.getByLabel("RAM")).toHaveValue("16 GB");
  await expect(page.getByLabel("Processor")).toHaveValue("Ryzen 7 7800X3D");
  await expect(page.getByLabel("PEGI")).toHaveCount(0);
});
