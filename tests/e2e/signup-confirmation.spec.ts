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
  expect(pending?.sameSite).toBe("Lax");
});
