import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

function alternateDevelopmentOrigin(baseURL: string | undefined) {
  const url = new URL(baseURL ?? "http://localhost:3000");
  url.hostname = "127.0.0.1";
  return url.origin;
}

test("a non-localhost development origin hydrates shared mobile controls", async ({ page, baseURL }) => {
  await page.goto(`${alternateDevelopmentOrigin(baseURL)}/test-harness/marketplace`, { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveAttribute("data-gg-hydrated", "true", { timeout: 5_000 });
  await expect(page.getByRole("button", { name: "Apply sort" })).toHaveCount(0);
  await page.getByRole("button", { name: /^Filters/ }).tap();
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
});

test("the Sell wizard hydrates when randomUUID is unavailable on an insecure origin", async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Crypto.prototype, "randomUUID", { configurable: true, value: undefined });
  });
  await page.goto(`${alternateDevelopmentOrigin(baseURL)}/test-harness/sell`, { waitUntil: "domcontentloaded" });

  const form = page.locator('form[data-hydrated]');
  await expect(form).toHaveAttribute("data-hydrated", "true", { timeout: 5_000 });
  const category = page.getByRole("button", { name: "PC Components" });
  await expect(category).toBeEnabled();
  await category.tap();
  await expect(category).toHaveAttribute("aria-pressed", "true");
});
