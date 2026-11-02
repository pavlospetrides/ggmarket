import { expect, test } from "@playwright/test";

test.use({ hasTouch: true, serviceWorkers: "block" });
test.skip(process.env.E2E_UI_HARNESS !== "1", "Safe notification UI harness is opt-in and uses mocked mutations.");

test("opening the panel reads only its displayed snapshot and keeps later arrivals unread", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let submitted: unknown;
  await page.route("**/api/notifications", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    submitted = route.request().postDataJSON();
    await held;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/test-harness/notifications");
  const harness = page.locator("[data-notification-harness]");
  const panelTrigger = harness.locator('[aria-controls="harness-notifications"]');
  await expect(harness.getByRole("link", { name: "Messages, 2 unread" })).toBeVisible();
  await panelTrigger.click();
  await expect(harness.getByText("First message")).toBeVisible();
  await harness.getByRole("button", { name: "Simulate incoming message" }).evaluate((button: HTMLButtonElement) => button.click());
  release();

  await expect.poll(() => submitted).toEqual({ ids: ["n1", "n2", "n3"] });
  await expect(harness.getByText("First message")).toHaveCount(0);
  await expect(harness.getByText("Arrived while open")).toBeVisible();
  await expect(harness.getByRole("link", { name: "Messages, 1 unread" })).toBeVisible();
  await expect(panelTrigger).toHaveAttribute("aria-label", "Notifications, 1 unread");
});

test("notification mutations show one compact loader and clear it after completion", async ({ page }) => {
  test.setTimeout(20_000);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/notifications", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    await held;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/test-harness/notifications?list=1");
  const markAll = page.getByRole("button", { name: "Mark all read" });
  await markAll.click();
  const updating = page.getByRole("button", { name: "Updating…" });
  await expect(updating.locator('[data-loader-size="compact"]')).toBeVisible();
  await expect(page.locator('[role="status"] [data-loader-size="compact"]')).toHaveCount(0);

  release();
  await expect(page.getByRole("button", { name: "Mark all read" })).toBeDisabled();
  await expect(page.locator('[data-loader-size="compact"]')).toHaveCount(0);
  expect(pageErrors.filter((message) => message.includes("Hydration failed"))).toEqual([]);
});
