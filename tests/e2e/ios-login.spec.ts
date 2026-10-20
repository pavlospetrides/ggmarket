import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test.describe("iOS login delivery", () => {
  test("the hydrated login control submits and exposes invalid-credential feedback", async ({ page, browserName }) => {
    let authRequests = 0;
    await page.route("**/auth/v1/token**", async (route) => {
      authRequests += 1;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ code: "invalid_credentials", message: "Invalid login credentials" }),
      });
    });
    await page.goto("/login");
    await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
    await page.getByLabel("Email").fill("iphone@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");

    const password = page.getByLabel("Password", { exact: true });
    const showPassword = page.getByRole("button", { name: "Show password" });
    if (browserName === "webkit") await showPassword.tap();
    else await showPassword.click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("not-a-real-password");
    const hidePassword = page.getByRole("button", { name: "Hide password" });
    if (browserName === "webkit") await hidePassword.tap();
    else await hidePassword.click();
    await expect(password).toHaveAttribute("type", "password");
    expect(authRequests).toBe(0);

    const login = page.getByRole("button", { name: "Log in" });
    await login.scrollIntoViewIfNeeded();
    const box = await login.boundingBox();
    expect(box).not.toBeNull();
    const receivesPointer = await page.evaluate(({ x, y }) => {
      return document.elementFromPoint(x, y)?.closest("button")?.textContent?.trim() === "Log in";
    }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
    expect(receivesPointer).toBe(true);
    if (browserName === "webkit") await login.tap();
    else await login.click();

    await expect(page.locator("#auth-form-error")).toHaveText("Invalid email or password.");
    expect(authRequests).toBe(1);
  });

  test("login remains operable when hydration never attaches", async ({ browser, browserName }) => {
    test.skip(browserName !== "webkit", "The no-hydration fallback targets iOS Safari");
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    let submittedBody = "";
    await page.route(/\/auth\/login$/, async (route) => {
      submittedBody = route.request().postData() ?? "";
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<!doctype html><html><body><p id="auth-form-error" role="alert">Invalid email or password.</p></body></html>',
      });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("iphone@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
    const login = page.getByRole("button", { name: "Log in" });
    await expect(login).toBeEnabled();

    const box = await login.boundingBox();
    expect(box).not.toBeNull();
    await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.locator("#auth-form-error")).toHaveText("Invalid email or password.");
    expect(submittedBody).toContain("email=iphone%40example.invalid");
    expect(submittedBody).toContain("password=not-a-real-password");
    await context.close();
  });
});

test.describe("iOS registration delivery", () => {
  test("password visibility and a real touch expose signup feedback", async ({ page, browserName }) => {
    let signupRequests = 0;
    await page.route("**/auth/v1/signup**", async (route) => {
      signupRequests += 1;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ code: "user_already_exists", message: "User already registered" }),
      });
    });
    await page.goto("/register");
    await expect(page.locator("form")).toHaveAttribute("data-hydrated", "true");
    await page.getByLabel("Username").fill("iphone_user");
    await page.getByLabel("Email").fill("iphone@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
    const visibility = page.getByRole("button", { name: "Show password" });
    if (browserName === "webkit") await visibility.tap();
    else await visibility.click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("not-a-real-password");
    const hide = page.getByRole("button", { name: "Hide password" });
    if (browserName === "webkit") await hide.tap();
    else await hide.click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
    expect(signupRequests).toBe(0);

    const submit = page.getByRole("button", { name: "Create account" });
    if (browserName === "webkit") await submit.tap();
    else await submit.click();
    await expect(page.locator("#auth-form-error")).toContainText("User already registered");
    expect(signupRequests).toBe(1);
  });

  test("signup remains operable when hydration never attaches", async ({ browser, browserName }) => {
    test.skip(browserName !== "webkit", "The no-hydration fallback targets iOS Safari");
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    let submittedBody = "";
    await page.route(/\/auth\/register$/, async (route) => {
      submittedBody = route.request().postData() ?? "";
      await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><p role=\"status\">Check your inbox</p>" });
    });
    await page.goto("/register");
    await page.getByLabel("Username").fill("iphone_user");
    await page.getByLabel("Email").fill("iphone@example.invalid");
    await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
    const submit = page.getByRole("button", { name: "Create account" });
    await expect(submit).toBeEnabled();
    await submit.tap();

    await expect(page.getByRole("status")).toHaveText("Check your inbox");
    expect(submittedBody).toContain("username=iphone_user");
    expect(submittedBody).toContain("email=iphone%40example.invalid");
    await context.close();
  });
});

test("reset-password visibility toggles preserve value and focus without submitting", async ({ page, browserName }) => {
  await page.goto("/test-harness/password");
  const password = page.getByRole("textbox", { name: "New password" });
  await password.fill("keep-this-secret");
  await password.focus();

  const show = page.getByRole("button", { name: "Show new password" });
  await expect(show).toBeEnabled({ timeout: 5_000 });
  if (browserName === "webkit") await show.tap();
  else await show.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("keep-this-secret");
  await expect(password).toBeFocused();
  await expect(page).toHaveURL(/\/test-harness\/password$/);

  const hide = page.getByRole("button", { name: "Hide new password" });
  if (browserName === "webkit") await hide.tap();
  else await hide.click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("keep-this-secret");
});
