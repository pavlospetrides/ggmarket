import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, serviceWorkers: "block" });
test.skip(process.env.E2E_UI_HARNESS !== "1", "Safe Sell UI harness is opt-in and never uses the configured Supabase project.");

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("Sell wizard accepts touch through every step and recovers from a mocked publish error", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releasePublish!: () => void;
  const publishGate = new Promise<void>((resolve) => { releasePublish = resolve; });
  await page.route("**/api/listings", async (route) => {
    await publishGate;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Test publish unavailable" }),
    });
  });
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

  await page.locator('label[for="listing-photos"]').evaluate((dropZone, base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], "one.png", { type: "image/png" }));
    transfer.items.add(new File([bytes], "two.png", { type: "image/png" }));
    dropZone.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
  }, png.toString("base64"));
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
    path: testInfo.outputPath("sell-preview.png"),
    fullPage: true,
    animations: "disabled",
  });
  await publish.tap();
  const publishing = page.getByRole("button", { name: "Publishing…" });
  await expect(publishing.locator('[data-loader-size="compact"]')).toBeVisible();
  await expect(page.locator("p:not(.sr-only)", { hasText: "Creating draft…" })).toBeVisible();
  releasePublish();
  await expect(page.locator("p:not(.sr-only)", { hasText: "Test publish unavailable" })).toBeVisible();
  await expect(publish).toBeEnabled();
  await expect(page.locator('[data-loader-size="compact"]')).toHaveCount(0);
});

test("Sell wizard marks the cover photo and reorders it on touch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-harness/sell", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  await page.getByRole("button", { name: "Games", exact: true }).tap();
  await page.getByLabel("Platform family").selectOption("playstation");
  await page.getByLabel("Console / Platform").selectOption("ps5");
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.tap();
  await page.getByLabel("Product or model").fill("Cover order fixture");
  await next.tap();

  await page.locator('input[type="file"]').setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: png },
    { name: "two.png", mimeType: "image/png", buffer: png },
  ]);
  const previews = page.locator('img[alt^="Upload preview"]');
  const secondSource = await previews.nth(1).getAttribute("src");
  expect(secondSource).toBeTruthy();
  await expect(page.getByText("Cover photo", { exact: true })).toHaveCount(1);

  await page.getByRole("button", { name: "Move photo 2 left" }).tap();
  await expect(previews.first()).toHaveAttribute("src", secondSource!);
  await expect(page.getByText("Cover photo", { exact: true })).toHaveCount(1);
});

test("Sell wizard cancels an in-flight photo upload and removes its mocked draft", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const listingId = "55555555-5555-4555-8555-555555555555";
  let cleanupRequested = false;
  let observedUploadId: string | undefined;
  let releaseUpload!: () => void;
  const uploadGate = new Promise<void>((resolve) => { releaseUpload = resolve; });
  await page.route("**/api/listings", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ id: listingId, status: "draft" }),
  }));
  await page.route("**/api/listings/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === `/api/listings/${listingId}/images`) {
      observedUploadId = request.postData()?.match(/name="uploadId"\r?\n\r?\n([^\r\n]+)/)?.[1];
      await uploadGate;
      await route.fulfill({ status: 201, contentType: "application/json", body: "{}" }).catch(() => undefined);
      return;
    }
    if (pathname === `/api/listings/${listingId}` && request.method() === "DELETE") {
      cleanupRequested = true;
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.abort("blockedbyclient");
  });
  await page.goto("/test-harness/sell", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  await page.getByRole("button", { name: "Games", exact: true }).tap();
  await page.getByLabel("Platform family").selectOption("playstation");
  await page.getByLabel("Console / Platform").selectOption("ps5");
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.tap();
  await page.getByLabel("Product or model").fill("Cancellation fixture");
  await next.tap();
  await page.locator('input[type="file"]').setInputFiles({ name: "one.png", mimeType: "image/png", buffer: png });
  await next.tap();
  await page.getByLabel("Listing title").fill("Cancelled upload fixture");
  await page.getByLabel("Description").fill("Safe mocked upload cancellation coverage.");
  await next.tap();
  await page.getByLabel(/^Price/).fill("100");
  await page.getByLabel("Location").fill("Test City");
  await next.tap();

  await page.getByRole("button", { name: "Publish", exact: true }).tap();
  const cancel = page.getByRole("button", { name: "Cancel upload" });
  await expect(cancel).toBeVisible();
  await cancel.tap();
  releaseUpload();
  await expect(page.locator("p:not(.sr-only)", { hasText: "Upload cancelled. The draft and uploaded photos are being removed." })).toBeVisible();
  await expect.poll(() => cleanupRequested).toBe(true);
  expect(observedUploadId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeEnabled();
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
  let releaseSave!: () => void;
  const saveGate = new Promise<void>((resolve) => { releaseSave = resolve; });
  await page.route("**/api/listings/33333333-3333-4333-8333-333333333333", async (route) => {
    if (route.request().method() === "PATCH") await saveGate;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Test update unavailable" }),
    });
  });
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
  const saving = page.getByRole("button", { name: "Saving…" });
  await expect(saving.locator('[data-loader-size="compact"]')).toBeVisible();
  releaseSave();
  await expect(page.getByText("Test update unavailable", { exact: true })).toBeVisible();
  await expect(save).toBeEnabled();
  await expect(page.locator('[data-loader-size="compact"]')).toHaveCount(0);
  await expect(page.getByLabel("Title")).toHaveValue("Updated test listing");

  await page.getByRole("button", { name: "Delete photo" }).first().tap();
  await expect(page.getByText("Test image removal unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete photo" }).first()).toBeEnabled();
});

