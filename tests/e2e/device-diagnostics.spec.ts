import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

test("opt-in device diagnostics report hydration and control taps without exposing field values", async ({ page }) => {
  await page.goto("/test-harness/password?ggdebug=1", { waitUntil: "domcontentloaded" });

  const diagnostics = page.getByRole("status", { name: "GGMarket device diagnostics" });
  await expect(diagnostics).toBeVisible();
  await expect(diagnostics).toContainText("Hydration: ready", { timeout: 5_000 });

  const password = page.getByRole("textbox", { name: "New password" });
  await password.fill("diagnostic-must-not-leak");
  await page.getByRole("button", { name: "Show new password" }).tap();
  await expect(diagnostics).toContainText("Last control: Show new password (button)");
  await expect(diagnostics).not.toContainText("diagnostic-must-not-leak");

  await diagnostics.getByRole("button", { name: "Close diagnostics" }).tap();
  await expect(diagnostics).toHaveCount(0);
  await expect(page).not.toHaveURL(/ggdebug=1/);
});

test("device diagnostics stay absent unless explicitly requested", async ({ page }) => {
  await page.goto("/test-harness/password", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status", { name: "GGMarket device diagnostics" })).toHaveCount(0);
});

test("device diagnostics still render and report disabled controls when a Next client asset fails", async ({ page }) => {
  let aborted = false;
  await page.route("**/_next/static/chunks/*.js", async (route) => {
    if (!aborted && !route.request().url().includes("dev-diagnostics")) {
      aborted = true;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });
  await page.goto("/test-harness/sell?ggdebug=1", { waitUntil: "domcontentloaded" });

  const diagnostics = page.getByRole("status", { name: "GGMarket device diagnostics" });
  await expect(diagnostics).toBeVisible();
  await expect(diagnostics).toContainText(/Next assets failed: [1-9]/);
  await expect(diagnostics).toContainText("Marked controls enabled: 0/2");
});
