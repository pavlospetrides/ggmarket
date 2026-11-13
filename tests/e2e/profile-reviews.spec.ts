import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";

test.use({ hasTouch: true, serviceWorkers: "block" });
test.skip(process.env.E2E_UI_HARNESS !== "1", "Mock profile review harness only; no cloud data changes.");

for (const view of ["public", "own"] as const) {
  test(`${view} profile rating summary opens existing paginated reviews`, async ({ page }, testInfo) => {
    await page.goto(`/test-harness/profile-reviews?view=${view}`);
    const summary = page.getByRole("link", { name: /4\.5.*2 ratings/ });
    await expect(summary).toBeVisible();
    await summary.click();
    await expect(page).toHaveURL(/#reviews-heading$/);
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeInViewport();
    await expect(page.getByText("Helpful and quick to respond.")).toBeVisible();
    await expect(page.getByText("Public Reviewer")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Review pages" })).toBeVisible();
    if (view === "public") {
      mkdirSync("docs/profile-crop-ratings-screenshots", { recursive: true });
      await page.screenshot({ path: `docs/profile-crop-ratings-screenshots/${testInfo.project.name}-reviews.png` });
    }
  });
}

test("empty rating summary opens friendly review empty state on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-harness/profile-reviews?empty=1");
  await page.getByRole("link", { name: "No ratings yet" }).tap();
  await expect(page).toHaveURL(/#reviews-heading$/);
  await expect(page.getByText("No reviews yet. Reviews from buyers and sellers will appear here.")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
