import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });
test.skip(process.env.E2E_UI_HARNESS !== "1", "Local read-only and intercepted draft fixtures; no cloud mutation.");

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function finishDraft(page: Page, title: string) {
  const next = page.getByRole("button", { name: "Next", exact: true });
  await next.click();
  await page.locator('input[type="file"]').setInputFiles({ name: "item.png", mimeType: "image/png", buffer: png });
  await next.click();
  await page.getByLabel("Listing title").fill(title);
  await page.getByLabel("Description").fill("A clearly photographed collectible offered by its owner.");
  await page.getByLabel("Condition").selectOption("good");
  await next.click();
  await page.getByLabel(/^Price/).fill("250");
  await page.getByLabel("City").fill("Nicosia");
  await next.click();
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator("p:not(.sr-only)", { hasText: "Captured safe collectible draft" })).toBeVisible();
}

test("Browse exposes all listings, both groups, and all twelve item types without overflow", async ({ page }) => {
  await page.goto("/test-harness/collectibles", { waitUntil: "domcontentloaded" });
  const category = page.getByRole("link", { name: /Collectibles & Cards/ }).first();
  await expect(category).toHaveAttribute("href", "/marketplace?category=collectibles");
  const directory = page.getByRole("region", { name: "Browse category directory" });
  await expect(directory.getByRole("link", { name: "All Collectibles & Cards" })).toHaveCount(3);
  await expect(directory.getByRole("link", { name: "Collectibles", exact: true })).toHaveCount(3);
  await expect(directory.getByRole("link", { name: "Cards", exact: true })).toHaveCount(3);
  await expect(directory.getByRole("link", { name: "Funko Pop" })).toHaveAttribute("href", /family=collectibles&item_type=funko-pop/);
  await expect(directory.getByRole("link", { name: "Sports Cards" })).toHaveAttribute("href", /family=cards&item_type=sports-cards/);
  await expect(page.getByText("Lootriva has not verified them")).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("Marketplace uses the same group and leaf filters", async ({ page }, testInfo) => {
  await page.goto("/test-harness/marketplace?category=collectibles&family=cards&item_type=pokemon-cards", { waitUntil: "domcontentloaded" });
  const filterPanel = testInfo.project.name.includes("mobile") || testInfo.project.name === "webkit"
    ? page.getByRole("dialog")
    : page.locator("aside").first();
  if (testInfo.project.name.includes("mobile") || testInfo.project.name === "webkit") await page.getByRole("button", { name: /Filters/ }).click();
  await expect(filterPanel.getByLabel("Collectibles or Cards")).toHaveValue("cards");
  await expect(filterPanel.getByLabel("Item type")).toHaveValue("pokemon-cards");
  if (testInfo.project.name.includes("mobile") || testInfo.project.name === "webkit") await page.keyboard.press("Escape");
  const taxonomy = page.locator(".taxonomy-navigator");
  await expect(taxonomy.getByRole("link", { name: "All Collectibles & Cards" })).toHaveAttribute("href", "/marketplace?category=collectibles");
  await expect(taxonomy.getByRole("link", { name: "Collectibles", exact: true })).toHaveAttribute("href", "/marketplace?category=collectibles&family=collectibles");
  await expect(taxonomy.getByRole("link", { name: "Cards", exact: true })).toHaveAttribute("href", "/marketplace?category=collectibles&family=cards");
});

test("Sell Wizard creates a Cards draft with conditional grading details", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/listings", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Captured safe collectible draft" }) });
  });
  await page.goto("/test-harness/sell", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Collectibles & Cards", exact: true }).click();
  await page.getByLabel("Collectibles or Cards").selectOption("cards");
  await page.getByLabel("Item type").selectOption("graded-cards");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("summary", { hasText: "Additional details (optional)" }).click();
  await page.getByLabel("Card Game / Collection").selectOption("pokemon");
  await page.getByLabel("Card Name").fill("Pikachu");
  await page.getByLabel("Set / Edition").fill("Base Set");
  await page.getByLabel("Graded / Ungraded").selectOption("graded");
  await page.getByLabel("Grading Company").selectOption("psa");
  await page.getByLabel("Grade", { exact: true }).fill("10");
  await finishDraft(page, "PSA 10 Pikachu card");
  expect(submitted).toMatchObject({ title: "PSA 10 Pikachu card", productName: "PSA 10 Pikachu card", location: "Nicosia", attributes: { family: "cards", item_type: "graded-cards", subcategory: "graded-cards", card_game: "pokemon", card_name: "Pikachu", set_name: "Base Set", grading_status: "graded", grading_company: "psa", grading_score: "10" } });
  expect(submitted?.attributes).not.toHaveProperty("manufacturer");
});

test("Sell Wizard creates a Collectibles draft without card-only fields", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/listings", async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Captured safe collectible draft" }) });
  });
  await page.goto("/test-harness/sell", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Collectibles & Cards", exact: true }).click();
  await page.getByLabel("Collectibles or Cards").selectOption("collectibles");
  await page.getByLabel("Item type").selectOption("funko-pop");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("summary", { hasText: "Additional details (optional)" }).click();
  await page.getByLabel("Brand / Franchise").fill("Funko");
  await page.getByLabel("Character / Series").fill("Link");
  await page.getByLabel("Original Packaging").check();
  await page.getByLabel("Limited Edition").check();
  await expect(page.getByLabel("Card Name")).toHaveCount(0);
  await finishDraft(page, "Limited Link Funko Pop");
  expect(submitted).toMatchObject({ title: "Limited Link Funko Pop", productName: "Limited Link Funko Pop", attributes: { family: "collectibles", item_type: "funko-pop", subcategory: "funko-pop", manufacturer: "Funko", character: "Link", original_box: true, limited_edition: true } });
  expect(submitted?.attributes).not.toHaveProperty("grading_status");
});
