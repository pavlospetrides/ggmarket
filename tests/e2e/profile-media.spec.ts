import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync } from "node:fs";

test.skip(process.env.E2E_UI_HARNESS !== "1", "Isolated UI harness only; cloud data untouched.");

test("avatar and cover controls preview, reposition, and persist through refresh in a mocked media session", async ({ page, context, baseURL }, testInfo) => {
  page.on("pageerror", (error) => { console.error("profile harness page error", error.stack); });
  page.on("console", (message) => { if (message.type() === "error") console.error("profile harness console error", message.text()); });
  page.on("response", (response) => { if (response.url().includes("/_next/") && response.status() >= 400) console.error("profile harness asset status", response.status(), response.url()); });
  const pixels = await sharp({ create: { width: 600, height: 400, channels: 3, background: "#7559ca" } }).png().toBuffer();
  await page.route("**/test-harness/profile-image?*", (route) => route.fulfill({ status: 200, contentType: "image/png", body: pixels }));
  await page.route("**/api/profile/media/*", async (route) => {
    const kind = route.request().url().endsWith("/cover") ? "cover" : "avatar";
    await context.addCookies([{ name: `profile-harness-${kind}`, value: route.request().method() === "DELETE" ? "0" : "1", url: new URL(baseURL!).origin }]);
    await route.fulfill({ status: 201, contentType: "application/json", body: "{}" });
  });
  await page.goto("/test-harness/profile-media");
  await expect(page.getByRole("img", { name: "Sample Seller avatar" })).toContainText("S");
  await page.getByRole("button", { name: "Edit photo" }).click();
  await page.getByLabel("Choose photo image").setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: pixels });
  await expect(page.getByRole("img", { name: /photo crop preview/ })).toBeVisible();
  await page.getByRole("slider", { name: "Crop & zoom" }).fill("2");
  await page.getByRole("img", { name: /photo crop preview/ }).press("ArrowRight");
  await page.getByRole("button", { name: "Save photo" }).click();
  await expect(page.getByRole("img", { name: "Sample Seller avatar" }).locator("img")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("img", { name: "Sample Seller avatar" }).locator("img")).toBeVisible();
  await page.getByRole("button", { name: "Edit cover" }).click();
  await page.getByLabel("Choose cover image").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: pixels });
  await expect(page.getByRole("img", { name: /cover crop preview/ })).toBeVisible();
  await page.getByRole("button", { name: "Save cover" }).click();
  await expect(page.locator('[data-profile-region="banner"] img')).toBeVisible();
  mkdirSync("docs/profile-media-screenshots", { recursive: true });
  await page.screenshot({ path: `docs/profile-media-screenshots/${testInfo.project.name}.png`, fullPage: true });
  await page.reload();
  await expect(page.locator('[data-profile-region="banner"] img')).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit cover" })).toBeEnabled();
  await page.getByRole("button", { name: "Edit cover" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove cover" }).click();
  await expect(page.locator('[data-profile-region="banner"] img')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-profile-region="banner"] img')).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("button", { name: "Edit cover" })).toBeVisible();
  }
});

test("an expired signed avatar refreshes once and renders the renewed URL", async ({ page, context, baseURL }) => {
  const pixels = await sharp({ create: { width: 100, height: 100, channels: 3, background: "#7559ca" } }).png().toBuffer();
  await context.addCookies([{ name: "profile-harness-avatar", value: "1", url: new URL(baseURL!).origin }]);
  let expiredRequests = 0;
  let refreshedRequests = 0;
  let refreshRequests = 0;
  page.on("request", (request) => { if (request.url().includes("/test-harness/profile-media") && request.url().includes("_rsc=")) refreshRequests++; });
  await page.route("**/test-harness/profile-image?*", async (route) => {
    if (route.request().url().includes("20200101")) {
      expiredRequests++;
      await context.addCookies([{ name: "profile-harness-fresh", value: "1", url: new URL(baseURL!).origin }]);
      await route.fulfill({ status: 403, body: "expired" });
    } else {
      refreshedRequests++;
      await route.fulfill({ status: 200, contentType: "image/png", body: pixels });
    }
  });
  await page.goto("/test-harness/profile-media");
  await expect(page.getByRole("img", { name: "Sample Seller avatar" }).locator("img")).toHaveAttribute("src", /20990101/);
  expect(expiredRequests).toBeGreaterThanOrEqual(1);
  expect(refreshedRequests).toBe(1);
  expect(refreshRequests).toBe(1);
});
