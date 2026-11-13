import { expect, test } from "@playwright/test";

test.skip(process.env.E2E_UI_HARNESS !== "1", "Uses a local UI fixture and intercepted application request.");

test("an unauthenticated visitor is sent to login before the application page", async ({ page }) => {
  await page.goto("/settings/seller-growth", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings%2Fseller-growth/);
  await expect(page.getByRole("button", { name: "Submit free application" })).toHaveCount(0);
});

test("the application action belongs to the seller's own profile", async ({ page }) => {
  await page.goto("/test-harness/profile-reviews?view=own", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("navigation", { name: "Your profile actions" }).getByRole("link", { name: "Apply for Free Verification" })).toBeVisible();
  await page.goto("/test-harness/profile-reviews?view=public", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Apply for Free Verification" })).toHaveCount(0);
});

test("a free application remains pending until staff approval", async ({ page }) => {
  let submitted: unknown;
  await page.route("**/api/seller-growth/verification", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ application: { id: "application-a", seller_id: "seller-a", status: "pending", application_note: "I source my own items and describe them accurately.", decision_reason: null, reviewed_at: null, resubmission_eligible_at: null, created_at: "2026-11-13T10:00:00Z", updated_at: "2026-11-13T10:00:00Z" } }) });
  });
  await page.goto("/test-harness/seller-verification", { waitUntil: "domcontentloaded" });
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply for Free Verification" })).toBeVisible();
  await page.getByLabel("How do you source and describe the items you sell?").fill("I source my own items and describe them accurately.");
  await page.getByRole("button", { name: "Submit free application" }).click();
  await expect(page.getByText("Application submitted. GGMarket will notify you after staff review.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit free application" })).toHaveCount(0);
  await expect(page.getByText("Application Under Review")).toBeVisible();
  await expect(page.getByText("Verified Seller")).toHaveCount(0);
  expect(submitted).toEqual({ statement: "I source my own items and describe them accurately." });
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("pending, approved, rejected, and revoked states expose only allowed actions", async ({ page }) => {
  await page.goto("/test-harness/seller-verification?status=pending", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Application Under Review").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit free application" })).toHaveCount(0);
  await page.goto("/test-harness/seller-verification?status=verified", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Verified Seller").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit free application" })).toHaveCount(0);
  await page.goto("/test-harness/seller-verification?status=rejected", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("The reapplication period has not opened yet.")).toBeVisible();
  await page.goto("/test-harness/seller-verification?status=revoked", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Submit free application" })).toBeVisible();
});

test("a paused program still explains where free applications will open", async ({ page }) => {
  await page.goto("/test-harness/seller-verification?paused=1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Apply for Free Verification" })).toBeVisible();
  await expect(page.getByText("Applications are currently paused.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit free application" })).toHaveCount(0);
});
