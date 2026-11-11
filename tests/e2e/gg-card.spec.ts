import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Production CSP upgrades local HTTP subresources. WebKit enforces that on
  // loopback while Chromium exempts localhost, so keep the real production
  // response/CSP and bridge only the test transport back to `next start`.
  await page.route("https://127.0.0.1:3100/**", async (route) => {
    const response = await route.fetch({ url: route.request().url().replace("https://", "http://") });
    await route.fulfill({ response });
  });
  await page.goto("/test-harness/gg-card");
  await expect(page.getByRole("heading", { name: "Lootriva Card interaction harness" })).toBeVisible();
});

test("public/private controls, lazy viewer, keyboard flip, and focus restoration", async ({ page }) => {
  const publicCard = page.getByTestId("public-card");
  const privateCard = page.getByTestId("private-card");
  const ownerCard = page.getByTestId("owner-card");

  await expect(publicCard.getByRole("button", { name: "View Lootriva Card" })).toBeVisible();
  await expect(publicCard.getByRole("button", { name: "Customize Card" })).toHaveCount(0);
  await expect(privateCard).toBeEmpty();
  await expect(ownerCard.getByRole("button", { name: "View My Card" })).toBeVisible();
  await expect(ownerCard.getByRole("button", { name: "Customize Card" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);

  const trigger = publicCard.getByRole("button", { name: "View Lootriva Card" });
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Synthetic Player's Lootriva Card" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("canvas")).toHaveCount(1);

  const badge = dialog.getByTestId("gg-card-badge");
  await badge.focus();
  await expect(badge).toHaveAttribute("aria-pressed", "false");
  await badge.press("Enter");
  await expect(badge).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("customization is bounded, themed, previewed, and private by default", async ({ page }) => {
  const ownerCard = page.getByTestId("owner-card");
  await ownerCard.getByRole("button", { name: "Customize Card" }).click();
  const dialog = page.getByRole("dialog", { name: "Customize My Lootriva Card" });
  const slogan = dialog.getByLabel("Slogan");
  await expect(slogan).toHaveAttribute("maxlength", "80");
  await expect(dialog.getByLabel("Show on my public profile")).not.toBeChecked();
  await slogan.fill("Keyboard warrior");
  await dialog.getByRole("radio", { name: "Crimson" }).click();
  await expect(dialog.getByLabel("Card preview")).toContainText("Keyboard warrior");
  await expect(dialog.getByRole("radio", { name: "Crimson" })).toHaveAttribute("aria-checked", "true");
  await dialog.getByRole("button", { name: "Restore defaults" }).click();
  await expect(slogan).toHaveValue("Play. Trade. Belong.");
});

test("normal motion animates while reduced motion settles to a static pose", async ({ page }) => {
  await page.getByTestId("public-card").getByRole("button", { name: "View Lootriva Card" }).click();
  const inner = page.getByTestId("gg-card-inner");
  const before = await inner.getAttribute("style");
  await page.waitForTimeout(350);
  const after = await inner.getAttribute("style");
  expect(after).not.toBe(before);

  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByTestId("public-card").getByRole("button", { name: "View Lootriva Card" }).click();
  const reducedInner = page.getByTestId("gg-card-inner");
  const reducedBefore = await reducedInner.getAttribute("style");
  await page.waitForTimeout(350);
  expect(await reducedInner.getAttribute("style")).toBe(reducedBefore);
  await page.getByTestId("gg-card-badge").press("Enter");
  await expect(page.getByTestId("gg-card-badge")).toHaveAttribute("aria-pressed", "true");
});

test("animation pauses while the document is hidden and resumes when visible", async ({ page }) => {
  await page.getByTestId("public-card").getByRole("button", { name: "View Lootriva Card" }).click();
  const inner = page.getByTestId("gg-card-inner");
  await expect(inner).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hidden = await inner.getAttribute("style");
  await page.waitForTimeout(350);
  expect(await inner.getAttribute("style")).toBe(hidden);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => inner.getAttribute("style")).not.toBe(hidden);
});

test("repeated viewer cycles keep one canvas, stop on close, and perform no data requests", async ({ page }) => {
  const protectedRequests: string[] = [];
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith("/api/") || /\/(?:rest|auth)\/v1\//.test(pathname)) protectedRequests.push(pathname);
  });
  const initialScripts = await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => entry.name.includes("/_next/") && entry.name.endsWith(".js")).length);
  const trigger = page.getByTestId("public-card").getByRole("button", { name: "View Lootriva Card" });
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await trigger.click();
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await expect(page.locator("canvas")).toHaveCount(0);
  }
  const loadedScripts = await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => entry.name.includes("/_next/") && entry.name.endsWith(".js")).length);
  expect(loadedScripts).toBeGreaterThan(initialScripts);
  expect(protectedRequests).toEqual([]);
});

test("dragging pulls the badge without accidentally flipping it", async ({ page }) => {
  await page.getByTestId("public-card").getByRole("button", { name: "View Lootriva Card" }).click();
  const badge = page.getByTestId("gg-card-badge");
  const before = await badge.boundingBox();
  expect(before).toBeTruthy();
  await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
  await page.mouse.down();
  await page.mouse.move(before!.x + before!.width / 2 + 90, before!.y + before!.height / 2 + 20, { steps: 8 });
  await page.waitForTimeout(120);
  const dragged = await badge.boundingBox();
  await page.mouse.up();
  expect(dragged).toBeTruthy();
  expect(Math.abs(dragged!.x - before!.x)).toBeGreaterThan(5);
  await expect(badge).toHaveAttribute("aria-pressed", "false");
});

test("mobile viewer remains inside the viewport with usable controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("public-card").getByRole("button", { name: "View Lootriva Card" }).click();
  const dialog = page.getByRole("dialog", { name: "Synthetic Player's Lootriva Card" });
  const box = await dialog.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  const close = dialog.getByRole("button", { name: "Close Lootriva Card" });
  const closeBox = await close.boundingBox();
  expect(closeBox?.width).toBeGreaterThanOrEqual(44);
  expect(closeBox?.height).toBeGreaterThanOrEqual(44);
});
