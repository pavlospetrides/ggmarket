import { expect, test } from "@playwright/test";

test("seller growth surfaces remain labelled and responsive", async ({ page }) => {
  await page.goto("/test-harness/seller-growth");
  await expect(page.getByRole("heading", { name: "Become one of the first 100 Lootriva sellers" })).toBeVisible();
  await expect(page.getByText("Promotional placement")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Become a Seller Reviewed account — Free" })).toBeVisible();
  await expect(page.getByText("This is not identity verification")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invite friends, earn boosts" })).toBeVisible();
  await expect(page.getByLabel("Referral link")).toHaveValue("https://lootriva.com/join?ref=FOUNDERS2026");
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll");
});
