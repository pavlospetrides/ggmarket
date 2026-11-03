import { expect, test } from "@playwright/test";

test("login and registration expose the accessible Google option", async ({ page }) => {
  for (const route of ["/login", "/register"]) {
    await page.goto(route);
    const google = page.getByRole("button", { name: "Continue with Google" });
    await expect(google).toBeVisible();
    await expect(google).toBeEnabled();
    await expect(google.locator("svg")).toHaveCount(1);
    if (route === "/login" && process.env.GOOGLE_AUTH_SCREENSHOT) {
      await page.screenshot({ path: process.env.GOOGLE_AUTH_SCREENSHOT, fullPage: true });
    }
  }
});

test("Google OAuth uses Supabase and preserves a safe original destination", async ({ page }) => {
  let authorizeUrl = "";
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = route.request().url();
    await route.abort();
  });
  await page.goto("/login?next=%2Flisting%2F11111111-1111-4111-8111-111111111111%3Ffrom%3Dfavorite");
  await page.getByRole("button", { name: "Continue with Google" }).click({ noWaitAfter: true });
  await expect.poll(() => authorizeUrl).not.toBe("");
  const authorize = new URL(authorizeUrl);
  expect(authorize.searchParams.get("provider")).toBe("google");
  const callback = new URL(authorize.searchParams.get("redirect_to")!);
  expect(callback.origin).toBe("http://localhost:3000");
  expect(callback.pathname).toBe("/auth/callback");
  expect(callback.searchParams.get("next")).toBe("/listing/11111111-1111-4111-8111-111111111111?from=favorite");
});

test("unsafe OAuth return destinations are replaced before provider navigation", async ({ page }) => {
  let authorizeUrl = "";
  await page.route("**/auth/v1/authorize**", async (route) => {
    authorizeUrl = route.request().url();
    await route.abort();
  });
  await page.goto("/login?next=https%3A%2F%2Fevil.example%2Fcapture");
  await page.getByRole("button", { name: "Continue with Google" }).click({ noWaitAfter: true });
  await expect.poll(() => authorizeUrl).not.toBe("");
  const callback = new URL(new URL(authorizeUrl).searchParams.get("redirect_to")!);
  expect(callback.searchParams.get("next")).toBe("/profile");
});
