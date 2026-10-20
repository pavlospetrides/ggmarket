import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

async function publicListingHref(page: import("@playwright/test").Page) {
  await page.goto("/marketplace");
  const href = await page.locator('a[href^="/listing/"]').first().getAttribute("href");
  test.skip(!href, "A public active listing is required for listing-control coverage");
  return href!;
}

test("listing share cancellation is handled without an unhandled browser error", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(await publicListingHref(page));
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => { throw new DOMException("Share canceled", "AbortError"); },
    });
  });

  const share = page.getByRole("button", { name: "Share" });
  if (testInfo.project.name === "webkit") await share.tap();
  else await share.click();
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  expect(errors).toEqual([]);
  await expect(page.getByRole("button", { name: "Share" })).toBeEnabled();
});

test("public navigation, search, auth entry points, and protected redirects remain functional", async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === "webkit" ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto("/");
  const heroSearch = page.locator(".campaign-hero").getByRole("search");
  await heroSearch.getByLabel("Search marketplace").fill("PS5 controller");
  await heroSearch.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search\?q=PS5(?:\+|%20)controller/);

  await page.goto("/login");
  await page.getByRole("link", { name: "Create account" }).click();
  await expect(page).toHaveURL("/register");
  await page.getByRole("link", { name: "Log in" }).click();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL("/forgot-password");

  for (const route of ["/favorites", "/messages", "/notifications", "/profile", "/profile/listings", "/saved-searches", "/sell", "/settings", "/settings/verification"]) {
    await page.goto(route);
    await expect(page, `${route} should preserve its destination through login`).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(route)}$`));
  }
  await page.goto("/admin");
  await expect(page, "admin access should stay role-hidden").toHaveURL("/");
});

test("listing gallery, report dialog, and unauthenticated report flow remain operable", async ({ page }, testInfo) => {
  const href = await publicListingHref(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(href);

  const gallery = page.getByRole("link", { name: "Open full-screen gallery" });
  if (await gallery.count()) {
    await expect(gallery).toHaveAttribute("data-hydrated", "true", { timeout: 5_000 });
    if (testInfo.project.name === "webkit") await gallery.tap();
    else await gallery.click();
    await expect(page.getByRole("dialog", { name: /full-screen gallery/i })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(gallery).toBeFocused();
  }

  const report = page.getByRole("button", { name: "Report listing" });
  if (testInfo.project.name === "webkit") await report.tap();
  else await report.click();
  const dialog = page.getByRole("dialog", { name: "Report listing" });
  await expect(dialog).toBeVisible();
  if (testInfo.project.name === "webkit") await dialog.getByRole("button", { name: "Submit report" }).tap();
  else await dialog.getByRole("button", { name: "Submit report" }).click();
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(href)}$`));
});

test("listing seller actions and public recovery paths produce navigation outcomes", async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === "webkit" ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  const href = await publicListingHref(page);
  await page.goto(href);
  const messageSeller = page.getByRole("button", { name: /Message seller|Contact seller/ }).filter({ visible: true }).first();
  await expect(messageSeller).toBeEnabled();
  if (testInfo.project.name === "webkit") await messageSeller.tap();
  else await messageSeller.click();
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(href)}$`));

  await page.goto("/offline");
  await page.getByRole("link", { name: "Try again" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/listing/11111111-1111-4111-8111-111111111111");
  const recovery = page.getByRole("link", { name: /Browse marketplace/ });
  if (await recovery.count()) {
    await recovery.click();
    await expect(page).toHaveURL(/\/marketplace$/);
  }
});

test("password recovery validation always gives visible feedback", async ({ page }, testInfo) => {
  await page.goto("/forgot-password");
  await page.route("**/auth/v1/recover**", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Unavailable" }) }));
  await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
  await page.getByLabel("Email").fill("iphone@example.invalid");
  const submit = page.getByRole("button", { name: "Send reset link" });
  if (testInfo.project.name === "webkit") await submit.tap();
  else await submit.click();
  await expect(page.getByRole("status")).toContainText("could not be sent");

  await expect(submit).toBeEnabled();
});

test("captures mobile and desktop public-route review frames", async ({ page }, testInfo) => {
  const output = join(process.cwd(), ".taste-skill", "ios-functional-audit");
  mkdirSync(output, { recursive: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const [name, route] of [["home", "/"], ["marketplace", "/marketplace"]] as const) {
      await page.goto(route, { waitUntil: "networkidle" });
      await page.screenshot({
        path: join(output, `${testInfo.project.name}-${viewport.width}-${name}.png`),
        fullPage: true,
      });
    }
  }
});
