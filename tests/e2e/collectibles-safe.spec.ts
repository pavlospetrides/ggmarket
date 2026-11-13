import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });
test.skip(process.env.E2E_UI_HARNESS !== "1", "Isolated collectibles UI harness only; cloud data untouched.");

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("collectibles stay prominent and contained across responsive layouts", async ({ page }) => {
  await page.goto("/test-harness/collectibles", { waitUntil: "domcontentloaded" });
  const card = page.getByRole("link", { name: /Collectibles & Trading Cards/ });
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("href", "/marketplace?category=collectibles");
  await expect(page.getByText("Lootriva has not verified them")).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("seller can create a graded-card draft with optional details", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/listings", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Captured safe collectible draft" }) });
  });
  await page.goto("/test-harness/sell", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  await page.getByRole("button", { name: "Collectibles & Trading Cards", exact: true }).click();
  await page.getByLabel("Collectible category").selectOption("pokemon-tcg");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Product type").selectOption("graded-card");
  const optional = page.locator("summary", { hasText: "Additional details (optional)" });
  await expect(optional).toBeVisible();
  await optional.click();
  await page.getByLabel("Is this card graded?").selectOption("graded");
  await page.getByLabel("Grading company").selectOption("psa");
  await page.getByLabel("Grade", { exact: true }).fill("10");
  await page.getByLabel("Certification number").fill("CERT-12345");
  await expect(page.getByText("Seller-provided grading details are not verified by Lootriva.")).toBeVisible();

  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await page.locator('input[type="file"]').setInputFiles({ name: "card.png", mimeType: "image/png", buffer: png });
  await next.click();
  await page.getByLabel("Listing title").fill("PSA 10 Pikachu card");
  await page.getByLabel("Description").fill("A clearly photographed graded trading card offered by its owner.");
  await page.getByLabel("Condition").selectOption("good");
  await next.click();
  await page.getByLabel(/^Price/).fill("250");
  await page.getByLabel("City").fill("Nicosia");
  await next.click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator("p:not(.sr-only)", { hasText: "Captured safe collectible draft" })).toBeVisible();

  expect(submitted).toMatchObject({
    title: "PSA 10 Pikachu card",
    productName: "PSA 10 Pikachu card",
    location: "Nicosia",
    attributes: {
      subcategory: "pokemon-tcg",
      product_type: "graded-card",
      grading_status: "graded",
      grading_company: "psa",
      grading_score: "10",
      grading_certification_number: "CERT-12345",
    },
  });
});
