import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block", hasTouch: true, isMobile: true });

async function firstFavorite(page: Page) {
  await page.goto("/marketplace");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const favorite = page.locator('button[data-favorite-state]:visible').first();
  test.skip(await favorite.count() === 0, "A public active listing is required for safe favorite interaction coverage");
  await expect(favorite).toHaveAccessibleName("Add to favorites");
  return favorite;
}

async function activate(target: ReturnType<Page["getByRole"]>) {
  await target.tap();
}

test("favorite tap is optimistic, filled, serialized, and rolls back accessibly", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let requestCount = 0;
  await page.route("**/api/favorites", async (route) => {
    requestCount += 1;
    await gate;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Favorite service unavailable." }),
    });
  });
  const favorite = await firstFavorite(page);
  const originalUrl = page.url();

  await activate(favorite);
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await expect(favorite).toHaveAttribute("data-favorite-state", "selected");
  await expect(favorite.locator("svg")).toHaveClass(/fill-\[#ff6978\]/);
  await expect(favorite).toHaveAttribute("aria-busy", "true");
  await expect(favorite).toBeEnabled();
  await favorite.dispatchEvent("click");
  expect(requestCount).toBe(1);
  expect(page.url()).toBe(originalUrl);

  release();
  await expect(page.getByText("Favorite service unavailable.", { exact: true })).toHaveAttribute("role", "alert");
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await expect(favorite).toHaveAttribute("data-favorite-state", "unselected");
  await expect(favorite).toBeEnabled();
  expect(page.url()).toBe(originalUrl);
});

test("unauthenticated favorite tap rolls back and preserves the current route for login", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/favorites", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: "Please log in to save listings." }),
  }));
  const favorite = await firstFavorite(page);

  await activate(favorite);

  await expect(page).toHaveURL(/\/login\?next=%2Fmarketplace$/);
});

test("favorite remains a working form control when hydration never attaches", async ({ browser, browserName }) => {
  test.skip(browserName !== "webkit", "The no-hydration fallback targets iOS Safari");
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  let submittedBody = "";
  await page.route("**/api/favorites", async (route) => {
    submittedBody = route.request().postData() ?? "";
    await route.fulfill({ status: 204 });
  });
  await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("load");
  const favorite = page.locator('button[data-favorite-state]:visible').first();
  if (await favorite.count() === 0) {
    await context.close();
    test.skip(true, "A public listing is required");
  }
  await expect(favorite).toBeEnabled();
  await favorite.tap({ noWaitAfter: true });
  await expect.poll(() => submittedBody).not.toBe("");
  expect(submittedBody).toContain("intent=add");
  expect(submittedBody).toMatch(/listingId=[0-9a-f-]{36}/);
  await context.close();
});

test("Favorites rail shows real listing data, flips into details, and removes without a route refresh", async ({ page }) => {
  let requests = 0;
  let documentRequests = 0;
  page.on("request", (request) => {
    if (request.resourceType() === "document") documentRequests += 1;
  });
  await page.route("**/api/favorites", async (route) => {
    requests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ favorite: false }),
    });
  });
  await page.goto("/test-harness/favorites");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const rail = page.locator("[data-favorite-lanyard-rail]");
  await expect(rail).toBeVisible();
  await expect(page.getByText("Showing 1–1 of 1 saved listing")).toBeVisible();
  const badge = rail.getByRole("button", { name: /Test favorite listing, €100, item 1 of 1/ });
  await expect(badge).toBeVisible();
  await expect(badge.locator("img")).toHaveCount(1);

  await activate(badge);
  await expect(badge).toHaveAttribute("aria-pressed", "true");
  const details = page.getByRole("region", { name: "Details for Test favorite listing" });
  await expect(details).toContainText("A safe browser-only listing used to verify dynamic favorite removal.");
  await expect(details).toContainText("Test Seller");
  await expect(details).toContainText("Ships");
  const listingLink = details.getByRole("link", { name: "View listing" });
  await expect(listingLink).toHaveAttribute("href", "/listing/77777777-7777-4777-8777-777777777777");
  await expect(details).toHaveAttribute("data-listing-anchor", "favorites:77777777-7777-4777-8777-777777777777");

  await page.keyboard.press("Escape");
  await expect(details).toBeHidden();
  await expect(badge).toHaveAttribute("aria-pressed", "false");
  await activate(badge);
  const remove = page.getByRole("region", { name: "Details for Test favorite listing" }).getByRole("button", { name: "Remove from favorites" });
  await activate(remove);

  await expect(rail).toBeHidden();
  await expect(page.getByText("Nothing saved yet")).toBeVisible();
  await expect.poll(() => requests).toBe(1);
  expect(documentRequests).toBe(1);
});

test("Favorites restores an optimistically removed rail item when the mutation fails", async ({ page }) => {
  await page.route("**/api/favorites", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "Favorite service unavailable." }),
  }));
  await page.goto("/test-harness/favorites");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const rail = page.locator("[data-favorite-lanyard-rail]");
  const badge = rail.getByRole("button", { name: /Test favorite listing/ });

  await activate(badge);
  await activate(page.getByRole("region", { name: "Details for Test favorite listing" }).getByRole("button", { name: "Remove from favorites" }));

  await expect(page.getByText("Favorite service unavailable.", { exact: true })).toHaveAttribute("role", "alert");
  await expect(rail.getByRole("button", { name: /Test favorite listing/ })).toBeVisible();
  await expect(page.getByText("Showing 1–1 of 1 saved listing")).toBeVisible();
});

for (const width of [320, 360, 375, 390, 414, 430]) {
  test(`Favorites rail and expanded details do not overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/test-harness/favorites?long=1");
    await page.locator("html[data-gg-hydrated='true']").waitFor();
    const badge = page.locator("[data-favorite-lanyard-rail]").getByRole("button", { name: /item 1 of/ });
    const badgeBox = await badge.boundingBox();
    const mobileNavBox = await page.getByRole("navigation", { name: "Mobile navigation" }).boundingBox();
    expect(badgeBox && mobileNavBox ? badgeBox.y + badgeBox.height <= mobileNavBox.y - 8 : false).toBe(true);
    await activate(badge);
    await expect(page.getByRole("region", { name: /Details for/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

for (const width of [768, 1024, 1280, 1440]) {
  test(`Favorites rail stays within the page at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/test-harness/favorites?many=1");
    await page.locator("html[data-gg-hydrated='true']").waitFor();
    await expect(page.locator("[data-favorite-lanyard-rail]")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

const responsiveRailCases = [
  { width: 320, count: 5, mode: "carousel", min: 138, max: 138 },
  { width: 360, count: 5, mode: "carousel", min: 140, max: 142 },
  { width: 375, count: 5, mode: "carousel", min: 147, max: 149 },
  { width: 390, count: 5, mode: "carousel", min: 153, max: 155 },
  { width: 414, count: 5, mode: "carousel", min: 163, max: 165 },
  { width: 430, count: 5, mode: "carousel", min: 168, max: 168 },
  { width: 768, count: 5, mode: "carousel", min: 176, max: 176 },
  { width: 1024, count: 5, mode: "carousel", min: 210, max: 210 },
  { width: 1280, count: 5, mode: "carousel", min: 230, max: 231 },
  { width: 1366, count: 5, mode: "rail", min: 210, max: 211 },
  { width: 1440, count: 5, mode: "carousel", min: 230, max: 231 },
  { width: 1920, count: 5, mode: "rail", min: 260, max: 260 },
  { width: 1366, count: 8, mode: "carousel", min: 240, max: 240 },
] as const;

for (const { width, count, mode, min, max } of responsiveRailCases) {
  test(`Favorites chooses ${mode} geometry for ${count} cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/test-harness/favorites?count=${count}`);
    await page.locator("html[data-gg-hydrated='true']").waitFor();
    const rail = page.locator("[data-favorite-lanyard-rail]");
    await expect(rail).toHaveAttribute("data-mode", mode);
    const cardWidth = await rail.locator("[data-favorite-badge]").first().evaluate((element) => Number.parseFloat((element as HTMLElement).style.width));
    expect(cardWidth).toBeGreaterThanOrEqual(min);
    expect(cardWidth).toBeLessThanOrEqual(max);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test("30 Favorites remain reachable through bounded eight-card physics batches", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.goto("/test-harness/favorites?count=30");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  await expect(page.getByText("Showing 1–8 of 30 saved listings")).toBeVisible();
  await expect(page.locator("[data-favorite-badge]")).toHaveCount(8);
  const next = page.getByRole("button", { name: "Next saved listings" });
  await next.click();
  await next.click();
  await next.click();
  await expect(page.getByText("Showing 25–30 of 30 saved listings")).toBeVisible();
  await expect(page.locator("[data-favorite-badge]")).toHaveCount(6);
});

test("quick vertical touch over a Favorite card stays native and never captures the pointer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-harness/favorites?count=5");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const stage = page.locator("[data-favorite-lanyard-rail] > div").first();
  const badge = stage.locator("[data-favorite-badge]").first();
  const box = await badge.boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  await stage.dispatchEvent("pointerdown", { pointerId: 41, pointerType: "touch", button: 0, clientX: x, clientY: y, isPrimary: true });
  await stage.dispatchEvent("pointermove", { pointerId: 41, pointerType: "touch", button: 0, clientX: x + 2, clientY: y + 48, isPrimary: true });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const translatedY = await badge.evaluate((element) => {
    const transform = getComputedStyle(element.parentElement as HTMLElement).transform;
    return new DOMMatrixReadOnly(transform).m42;
  });
  expect(translatedY).toBeLessThanOrEqual(1);
  await stage.dispatchEvent("pointercancel", { pointerId: 41, pointerType: "touch", button: 0, clientX: x + 2, clientY: y + 48, isPrimary: true });
});

test("pointer cancellation releases custom lanyard interaction without flipping the card", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.goto("/test-harness/favorites?count=5");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const rail = page.locator("[data-favorite-lanyard-rail]");
  const stage = rail.locator(":scope > div").first();
  const badge = stage.locator("[data-favorite-badge]").first();
  const box = await badge.boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 20);
  expect(await stage.evaluate((element) => element.hasPointerCapture(1))).toBe(true);
  await stage.dispatchEvent("pointercancel", { pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y + 20, isPrimary: true });
  await page.mouse.up();
  expect(await stage.evaluate((element) => element.hasPointerCapture(1))).toBe(false);
  await expect(badge).toHaveAttribute("aria-pressed", "false");
});

test("an invalidated touch pointer fails closed without an uncaught capture error", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-harness/favorites?count=3");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const stage = page.locator("[data-favorite-lanyard-rail] > div").first();
  const badge = stage.locator("[data-favorite-badge]").first();
  const box = await badge.boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  await stage.dispatchEvent("pointerdown", { pointerId: 81, pointerType: "touch", button: 0, clientX: x, clientY: y, isPrimary: true });
  await page.waitForTimeout(200);
  await stage.dispatchEvent("pointermove", { pointerId: 81, pointerType: "touch", button: 0, clientX: x, clientY: y + 24, isPrimary: true });
  await stage.dispatchEvent("pointercancel", { pointerId: 81, pointerType: "touch", button: 0, clientX: x, clientY: y + 24, isPrimary: true });
  expect(pageErrors).toEqual([]);
});

test("mobile horizontal swipe advances the carousel after a cancelled vertical gesture", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-harness/favorites?count=5");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const rail = page.locator("[data-favorite-lanyard-rail]");
  const stage = rail.locator(":scope > div").first();
  // Script-created PointerEvents do not represent an active hardware pointer, so
  // emulate capture here while the invalid-pointer test above exercises fail-closed behavior.
  await stage.evaluate((element) => {
    let capturedPointer = -1;
    element.setPointerCapture = (pointerId: number) => {
      capturedPointer = pointerId;
    };
    element.hasPointerCapture = (pointerId: number) => capturedPointer === pointerId;
    element.releasePointerCapture = (pointerId: number) => {
      if (capturedPointer === pointerId) capturedPointer = -1;
    };
  });
  const badge = stage.locator("[data-favorite-badge]").first();
  const box = await badge.boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  const initialId = await rail.getAttribute("data-active-id");

  await stage.dispatchEvent("pointerdown", { pointerId: 61, pointerType: "touch", button: 0, clientX: x, clientY: y, isPrimary: true });
  await stage.dispatchEvent("pointermove", { pointerId: 61, pointerType: "touch", button: 0, clientX: x + 2, clientY: y + 40, isPrimary: true });
  await stage.dispatchEvent("pointercancel", { pointerId: 61, pointerType: "touch", button: 0, clientX: x + 2, clientY: y + 40, isPrimary: true });
  await stage.dispatchEvent("pointerdown", { pointerId: 62, pointerType: "touch", button: 0, clientX: x, clientY: y, isPrimary: true });
  await stage.dispatchEvent("pointermove", { pointerId: 62, pointerType: "touch", button: 0, clientX: x - 70, clientY: y + 2, isPrimary: true });
  await stage.dispatchEvent("pointerup", { pointerId: 62, pointerType: "touch", button: 0, clientX: x - 70, clientY: y + 2, isPrimary: true });

  await expect(rail).not.toHaveAttribute("data-active-id", initialId ?? "");
});

test("a deliberate pointer pull still stretches and settles the card", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-harness/favorites?count=3");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const stage = page.locator("[data-favorite-lanyard-rail] > div").first();
  const badge = stage.locator("[data-favorite-badge]").first();
  const box = await badge.boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  const restY = await badge.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element.parentElement as HTMLElement).transform).m42);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 1, y + 36);
  await expect.poll(() => badge.evaluate((element) => {
    const transform = getComputedStyle(element.parentElement as HTMLElement).transform;
    return new DOMMatrixReadOnly(transform).m42;
  })).toBeGreaterThan(restY + 10);
  await page.mouse.up();
  await expect.poll(() => badge.evaluate((element, baseline) => {
    const transform = getComputedStyle(element.parentElement as HTMLElement).transform;
    return Math.abs(new DOMMatrixReadOnly(transform).m42 - baseline);
  }, restY)).toBeLessThan(1);
});

test("reduced motion keeps selection and flip controls functional", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/test-harness/favorites?count=3");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const badge = page.locator("[data-favorite-lanyard-rail] [data-favorite-badge]").first();
  await badge.tap();
  await expect(badge).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: /Details for/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(badge).toHaveAttribute("aria-pressed", "false");
});

test("rapid favorite taps persist the latest intent in request order", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const methods: string[] = [];
  await page.route("**/api/favorites", async (route) => {
    const method = route.request().method();
    methods.push(method);
    if (methods.length === 1) await gate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ favorite: method === "POST" }),
    });
  });
  await page.goto("/test-harness/marketplace");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const favorite = page.locator('button[data-favorite-state]').first();
  await expect(favorite).toHaveAccessibleName("Add to favorites");

  await activate(favorite);
  await expect(favorite).toHaveAttribute("data-favorite-state", "selected");
  await activate(favorite);
  await expect(favorite).toHaveAttribute("data-favorite-state", "unselected");
  release();

  await expect.poll(() => methods).toEqual(["POST", "DELETE"]);
  await expect(favorite).toHaveAttribute("aria-busy", "false");
  await expect(favorite).toHaveAttribute("data-favorite-state", "unselected");
});

test("Account A and Account B remain isolated when an earlier request resolves late", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseAccountA!: () => void;
  const accountAGate = new Promise<void>((resolve) => { releaseAccountA = resolve; });
  const methods: string[] = [];
  const bodies: Array<Record<string, unknown>> = [];
  let documentRequests = 0;
  page.on("request", (request) => {
    if (request.resourceType() === "document") documentRequests += 1;
  });
  await page.route("**/api/favorites", async (route) => {
    methods.push(route.request().method());
    bodies.push(JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>);
    if (methods.length === 1) await accountAGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ favorite: route.request().method() === "POST" }),
    });
  });
  await page.goto("/test-harness/favorites?accounts=1");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const marketplace = page.getByRole("region", { name: "Marketplace card favorite" });
  const detail = page.getByRole("region", { name: "Listing detail favorite" });

  await activate(marketplace.getByRole("button", { name: "Add to favorites" }));
  await expect(marketplace.getByRole("button", { name: "Remove from favorites" })).toHaveAttribute("aria-busy", "true");
  await expect(detail.getByRole("button", { name: "Remove from favorites" })).toBeVisible();

  await page.getByRole("button", { name: "Log out and switch to Account B" }).click();
  await expect(page.getByText("Signed in as Account B")).toBeVisible();
  await expect(marketplace.getByRole("button", { name: "Add to favorites" })).toHaveAttribute("aria-busy", "false");
  await expect(detail.getByRole("button", { name: "Add to favorites" })).toBeVisible();

  await activate(detail.getByRole("button", { name: "Add to favorites" }));
  await expect(detail.getByRole("button", { name: "Remove from favorites" })).toHaveAttribute("aria-busy", "false");
  expect(methods).toEqual(["POST", "POST"]);
  expect(bodies).toEqual([{ listingId: "77777777-7777-4777-8777-777777777777" }, { listingId: "77777777-7777-4777-8777-777777777777" }]);

  releaseAccountA();
  await expect(page.getByText("Persisted A: saved")).toBeVisible();
  await expect(page.getByText("Persisted B: saved")).toBeVisible();
  await expect(detail.getByRole("button", { name: "Remove from favorites" })).toBeVisible();

  await activate(detail.getByRole("button", { name: "Remove from favorites" }));
  await expect(page.getByText("Persisted B: not saved")).toBeVisible();
  await expect(detail.getByRole("button", { name: "Add to favorites" })).toBeVisible();

  await page.getByRole("button", { name: "Log out and switch to Account A" }).click();
  await expect(page.getByText("Signed in as Account A")).toBeVisible();
  await expect(marketplace.getByRole("button", { name: "Remove from favorites" })).toBeVisible();
  expect(methods).toEqual(["POST", "POST", "DELETE"]);
  expect(documentRequests).toBe(1);
});

test("a delayed Account A failure cannot roll back or alert Account B", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/favorites", async (route) => {
    await gate;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Account A request failed." }),
    });
  });
  await page.goto("/test-harness/favorites?accounts=1");
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  const marketplace = page.getByRole("region", { name: "Marketplace card favorite" });

  await activate(marketplace.getByRole("button", { name: "Add to favorites" }));
  await page.getByRole("button", { name: "Log out and switch to Account B" }).click();
  await expect(marketplace.getByRole("button", { name: "Add to favorites" })).toBeVisible();

  release();
  await expect(marketplace.getByRole("button", { name: "Add to favorites" })).toHaveAttribute("aria-busy", "false");
  await expect(page.getByText("Account A request failed.", { exact: true })).toHaveCount(0);
});

for (const width of [320, 375, 390, 393, 430]) {
  test(`favorite touch stays dynamic without document navigation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    let documentRequests = 0;
    page.on("request", (request) => {
      if (request.resourceType() === "document") documentRequests += 1;
    });
    await page.route("**/api/favorites", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ favorite: true }),
    }));
    await page.goto("/test-harness/marketplace");
    await page.locator("html[data-gg-hydrated='true']").waitFor();
    const favorite = page.locator("button[data-favorite-state]").first();

    await favorite.tap();

    await expect(favorite).toHaveAttribute("data-favorite-state", "selected");
    await expect(favorite.locator("svg")).toHaveClass(/fill-\[#ff6978\]/);
    expect(documentRequests).toBe(1);
  });
}
