import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("an email-link GET stops at an explicit confirmation page", async ({ page }) => {
  const tokenHash = "a".repeat(64);
  await page.goto(`/auth/recovery?token_hash=${tokenHash}&type=recovery`);

  await expect(page).toHaveURL(/\/auth\/recovery\/continue$/);
  await expect(page.getByRole("heading", { name: "Continue password reset" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to create new password" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create new password" })).toHaveCount(0);
});

test("an external email origin reaches an actionable clean recovery landing", async ({ page, context }) => {
  const tokenHash = "e".repeat(64);
  await page.goto("http://localhost:3000/login");
  await page.evaluate((href) => {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = "Open reset email";
    document.body.append(link);
  }, `http://127.0.0.1:3000/auth/recovery?token_hash=${tokenHash}&type=recovery`);

  await Promise.all([
    page.waitForURL(/\/auth\/recovery\/continue$/),
    page.getByRole("link", { name: "Open reset email" }).click(),
  ]);

  await expect(page.getByRole("heading", { name: "Continue password reset" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to create new password" })).toBeVisible();
  expect(page.url()).not.toContain(tokenHash);
  const pending = (await context.cookies()).find((cookie) => cookie.name === "ggmarket-recovery-pending");
  expect(pending?.httpOnly).toBe(true);
});

test("native recovery confirmation POST preserves its trusted origin", async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  let submittedOrigin: string | undefined;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/auth/recovery/confirm") {
      submittedOrigin = request.headers().origin;
    }
  });

  await page.goto(`/auth/recovery?token_hash=${"r".repeat(64)}&type=recovery`);
  const [confirmationResponse] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === "/auth/recovery/confirm"),
    page.getByRole("button", { name: "Continue to create new password" }).click(),
  ]);

  expect(confirmationResponse.status()).toBe(303);
  expect(submittedOrigin).toBe("http://localhost:3000");
  const redirect = new URL(confirmationResponse.headers().location);
  expect(`${redirect.pathname}${redirect.search}`).toMatch(/^\/reset-password\?status=/);
  expect(confirmationResponse.headers()["content-type"]).toBeUndefined();
  await context.close();
});
test("reset requests target the browser-independent recovery verifier", async ({ page }) => {
  let recoveryRequest = "";
  await page.route("**/auth/v1/recover**", async (route) => {
    recoveryRequest = route.request().url();
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("recovery-cross-browser@example.invalid");
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect.poll(() => recoveryRequest).not.toBe("");
  expect(new URL(recoveryRequest).searchParams.get("redirect_to")).toBe("http://localhost:3000/auth/recovery");
  await expect(page.getByRole("status")).toContainText("reset link has been sent");
});
test("expired recovery stays out of stale Google OAuth messaging", async ({ page }) => {
  await page.goto("/reset-password?status=expired_or_used&error=oauth_cancelled");

  await expect(page.getByRole("heading", { name: "Reset link unavailable" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request new reset link" })).toBeVisible();
  await expect(page.getByText("Google sign-in was cancelled")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toHaveCount(0);
});

test("new-password form validates, loads, and confirms success", async ({ page, browserName }) => {
  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
  let submittedBody = "";
  await page.route(/\/auth\/update-password$/, async (route) => {
    submittedBody = route.request().postData() ?? "";
    await responseGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });

  await page.goto("/test-harness/password");
  const password = page.getByLabel("New password", { exact: true });
  const confirmation = page.getByLabel("Confirm new password", { exact: true });
  await password.fill("new-password-value");
  await confirmation.fill("different-value");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.locator("#password-recovery-error")).toHaveText("Passwords do not match.");
  await expect(confirmation).toBeFocused();
  expect(submittedBody).toBe("");

  const showPassword = page.getByRole("button", { name: "Show new password" });
  if (browserName === "webkit") await showPassword.tap();
  else await showPassword.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("new-password-value");

  await confirmation.fill("new-password-value");
  const submit = page.getByRole("button", { name: "Update password" });
  if (browserName === "webkit") await submit.tap();
  else await submit.click();
  await expect(page.getByRole("button", { name: "Updating…" })).toBeDisabled();
  releaseResponse();

  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to login" })).toBeVisible();
  expect(new URLSearchParams(submittedBody).get("password")).toBe("new-password-value");
});

test("new-password form gives actionable server errors", async ({ page }) => {
  await page.route(/\/auth\/update-password$/, async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ status: "rejected", message: "Choose a password you have not used before." }),
    });
  });

  await page.goto("/test-harness/password");
  await page.getByLabel("New password", { exact: true }).fill("new-password-value");
  await page.getByLabel("Confirm new password", { exact: true }).fill("new-password-value");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(page.locator("#password-recovery-error")).toHaveText("Choose a password you have not used before.");
  await expect(page.locator("#password-recovery-error")).toBeFocused();
});

test("mobile WebKit can submit the recovery form without JavaScript", async ({ browser, browserName }) => {
  test.skip(browserName !== "webkit", "The no-hydration fallback targets iPhone WebKit");
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  let submittedBody = "";
  await page.route(/\/auth\/update-password$/, async (route) => {
    submittedBody = route.request().postData() ?? "";
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body><h1>Password updated</h1></body></html>",
    });
  });

  await page.goto("/test-harness/password");
  await page.getByLabel("New password", { exact: true }).fill("new-password-value");
  await page.getByLabel("Confirm new password", { exact: true }).fill("new-password-value");
  await page.getByRole("button", { name: "Update password" }).tap();

  await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();
  expect(new URLSearchParams(submittedBody).get("confirmation")).toBe("new-password-value");
  await context.close();
});
