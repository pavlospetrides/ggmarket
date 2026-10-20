import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block", hasTouch: true, isMobile: true });

const listingId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";

async function activate(page: Page, name: string) {
  const button = page.getByRole("button", { name, exact: true });
  await button.tap();
}

test("authenticated detail and sticky taps carry listing context and serialize conversation creation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const bodies: string[] = [];
  const messageNavigations: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === `/messages/${conversationId}`) {
      messageNavigations.push(request.url());
    }
  });
  await page.route("**/api/conversations", async (route) => {
    bodies.push(route.request().postData() ?? "");
    await gate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: conversationId }),
    });
  });
  await page.goto("/test-harness/message-seller?authenticated=1");

  await activate(page, "Message seller");
  await expect(page.getByRole("button", { name: "Opening…" })).toBeDisabled();
  await page.getByRole("button", { name: "Opening…" }).dispatchEvent("click");
  expect(bodies).toHaveLength(1);
  expect(JSON.parse(bodies[0])).toEqual({ listingId });

  release();
  await expect.poll(() => messageNavigations.length).toBe(1);

  await page.goto("/test-harness/message-seller?authenticated=1");
  await activate(page, "Message");
  await expect.poll(() => bodies.length).toBe(2);
  expect(JSON.parse(bodies[1])).toEqual({ listingId });
});

test("signed-out touch preserves listing context for login", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/test-harness/message-seller");

  await activate(page, "Message");

  await expect(page).toHaveURL(`/login?next=%2Flisting%2F${listingId}`);
});

test("conversation failure remains visible and retryable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.route("**/api/conversations", (route) => route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({ error: "This conversation could not be started." }),
  }));
  await page.goto("/test-harness/message-seller?authenticated=1");
  await page.locator("html[data-gg-hydrated='true']").waitFor();

  await activate(page, "Message seller");

  await expect(page.getByText("This conversation could not be started.", { exact: true })).toHaveAttribute("role", "alert");
  await expect(page.getByRole("button", { name: "Message seller" })).toBeEnabled();
});

test("own listing intentionally offers no conversation action", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/conversations", (route) => {
    requests += 1;
    return route.abort();
  });
  await page.goto("/test-harness/message-seller?authenticated=1&own=1");

  await expect(page.getByText("This is your listing.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /Message/ })).toHaveCount(0);
  expect(requests).toBe(0);
});

test("Message Seller remains a native authenticated POST when hydration never attaches", async ({ browser, browserName }) => {
  test.skip(browserName !== "webkit", "The no-hydration fallback targets iPhone Safari");
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  let method = "";
  let submittedBody = "";
  await page.route("**/api/conversations", async (route) => {
    method = route.request().method();
    submittedBody = route.request().postData() ?? "";
    await route.fulfill({ status: 204 });
  });
  await page.goto("/test-harness/message-seller?authenticated=1", { waitUntil: "domcontentloaded" });
  const button = page.getByRole("button", { name: "Message", exact: true });

  await expect(button).toBeEnabled();
  await button.tap({ noWaitAfter: true });
  await expect.poll(() => submittedBody).not.toBe("");
  expect(method).toBe("POST");
  expect(submittedBody).toContain(`listingId=${listingId}`);
  await context.close();
});

for (const width of [320, 375, 390, 393, 430]) {
  test(`mobile sticky Message Seller accepts touch at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/test-harness/message-seller");
    await page.locator("html[data-gg-hydrated='true']").waitFor();

    await activate(page, "Message");

    await expect(page).toHaveURL(`/login?next=%2Flisting%2F${listingId}`);
  });
}
