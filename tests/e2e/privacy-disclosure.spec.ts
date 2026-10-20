import { expect, test } from "@playwright/test";

test("cookie disclosure is reachable without a consent gate", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Cookie policy" })).toBeVisible();
  await expect(page.getByRole("button", { name: /accept.*cookies/i })).toHaveCount(0);
  await page.getByRole("link", { name: "Cookie policy" }).click();
  await expect(page.getByRole("heading", { name: "Cookie policy", level: 1 })).toBeVisible();
  await expect(page.getByText("Essential only", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Footer navigation" }).getByRole("link", { name: "Privacy policy" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  if ((page.viewportSize()?.width ?? 0) < 768) {
    expect(await page.locator(".policy-table-wrap").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
});

test("privacy disclosure exposes owner-review gaps without inventing details", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Owner review required" })).toBeVisible();
  await expect(page.getByText(/insert and legally verify the controller's legal identity/i)).toBeVisible();
});
