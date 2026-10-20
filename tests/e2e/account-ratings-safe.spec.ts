import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, serviceWorkers: "block" });
test.skip(process.env.E2E_UI_HARNESS !== "1", "Safe verification/rating UI harness is opt-in and never mutates Supabase.");

test("email verification responds to touch without claiming success before confirmation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/verification/email", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "sent" }) });
  });
  await page.goto("/test-harness/verification?status=invalid_or_expired", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("This verification link is invalid or has expired.", { exact: false })).toBeVisible();
  const resend = page.getByRole("button", { name: "Resend verification email" });
  await resend.tap();
  await expect(page.getByRole("button", { name: "Sending…" })).toBeDisabled();
  await expect(page.getByText("Verification email sent. Check your inbox.")).toBeVisible();
  await expect(page.getByText("Account verified successfully")).toHaveCount(0);

  await page.goto("/test-harness/verification?confirmed=1&status=verified", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Account verified successfully")).toBeVisible();
});

test("rating stars and submission work with mobile touch and update the summary", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/reviews?sellerId=**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rating: null }) }));
  await page.route("**/api/reviews", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataJSON() as { rating: number; comment: string };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      updated: false,
      summary: { average: body.rating, count: 1 },
      review: { id: "review-1", reviewerId: "account-a", rating: body.rating, comment: body.comment, createdAt: "2026-10-20", reviewerName: "Account A" },
    }) });
  });
  await page.goto("/test-harness/rating", { waitUntil: "domcontentloaded" });
  const rate = page.getByRole("button", { name: "Rate this user" });
  await expect(rate).toBeEnabled();
  await expect(rate).toHaveAttribute("data-hydrated", "true");
  await rate.tap();
  await page.getByRole("radio", { name: "5 stars" }).tap();
  await expect(page.getByRole("radio", { name: "5 stars" })).toHaveAttribute("aria-checked", "true");
  await page.getByLabel("Review (optional)").fill("Helpful seller");
  await page.getByRole("button", { name: "Submit rating" }).tap();
  await expect(page.getByText("Your rating was saved.")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("5.0 / 5 — 1 rating");
});
