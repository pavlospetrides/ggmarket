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

test("Favorites removes a confirmed item without a route refresh", async ({ page }) => {
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
  const card = page.locator("article").filter({ hasText: "Test favorite listing" });
  await expect(card).toBeVisible();
  const remove = card.getByRole("button", { name: "Remove from favorites" });
  await activate(remove);

  await expect(card).toBeHidden();
  await expect(page.getByText("Nothing saved yet")).toBeVisible();
  await expect.poll(() => requests).toBe(1);
  expect(documentRequests).toBe(1);
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
