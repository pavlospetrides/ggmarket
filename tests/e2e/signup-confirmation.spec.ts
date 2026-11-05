import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("external email navigation stops at explicit signup confirmation", async ({ page, context }) => {
  const tokenHash = "s".repeat(64);
  await page.goto("http://localhost:3000/login");
  await page.evaluate((href) => {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = "Open confirmation email";
    document.body.append(link);
  }, `http://127.0.0.1:3000/auth/confirm-signup?token_hash=${tokenHash}&type=email`);
  await Promise.all([
    page.waitForURL(/\/auth\/confirm-signup\/continue$/),
    page.getByRole("link", { name: "Open confirmation email" }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verify email and continue" })).toBeVisible();
  expect(page.url()).not.toContain(tokenHash);
  const pending = (await context.cookies()).find((cookie) => cookie.name === "ggmarket-signup-confirmation-pending");
  expect(pending?.httpOnly).toBe(true);
});

test("native signup confirmation POST preserves its trusted origin", async ({ page }) => {
  const tokenHash = "n".repeat(64);
  let submittedOrigin: string | undefined;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/auth/confirm-signup/verify") {
      submittedOrigin = request.headers().origin;
    }
  });

  await page.goto(`/auth/confirm-signup?token_hash=${tokenHash}&type=email`);
  const [verificationResponse] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === "/auth/confirm-signup/verify"),
    page.getByRole("button", { name: "Verify email and continue" }).click(),
  ]);

  expect(verificationResponse.status()).toBe(303);
  expect(submittedOrigin).toBe("http://localhost:3000");
  await expect(page).toHaveURL(/\/verify-email\?status=/);
  await expect(page.locator("body")).not.toContainText("Cross-site request denied");
});

test("iPhone WebKit can submit signup confirmation without JavaScript", async ({ browser, browserName }) => {
  test.skip(browserName !== "webkit", "The native no-JavaScript fallback targets iPhone WebKit");
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  let submittedOrigin: string | undefined;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/auth/confirm-signup/verify") {
      submittedOrigin = request.headers().origin;
    }
  });

  await page.goto(`/auth/confirm-signup?token_hash=${"j".repeat(64)}&type=email`);
  await page.getByRole("button", { name: "Verify email and continue" }).tap();

  await expect(page).toHaveURL(/\/verify-email\?status=/);
  expect(submittedOrigin).toBe("http://localhost:3000");
  await expect(page.locator("body")).not.toContainText("Cross-site request denied");
  await context.close();
});
