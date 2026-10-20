import { expect, test, type Page, type Route } from "@playwright/test";

test.use({ serviceWorkers: "block", hasTouch: true, isMobile: true });

const conversationId = "11111111-1111-4111-8111-111111111111";
type StoredMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  client_id: string;
  created_at: string;
};

async function installMessageService(
  page: Page,
  messages: StoredMessage[],
  options: { failNext?: { value: boolean }; holdNext?: { promise: Promise<void> } } = {},
) {
  await page.route("**/api/conversations/**/messages", async (route: Route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ messages }) });
      return;
    }
    if (request.method() === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    if (options.holdNext) {
      const hold = options.holdNext;
      options.holdNext = undefined;
      await hold.promise;
    }
    if (options.failNext?.value) {
      options.failNext.value = false;
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Message could not be sent." }) });
      return;
    }
    const body = request.postDataJSON() as { body: string; clientId: string };
    const viewer = new URL(page.url()).searchParams.get("viewer") ?? "account-a";
    const existing = messages.find((item) => item.sender_id === viewer && item.client_id === body.clientId);
    const row = existing ?? {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      sender_id: viewer,
      body: body.body.trim(),
      client_id: body.clientId,
      created_at: new Date().toISOString(),
    };
    if (!existing) messages.push(row);
    await route.fulfill({ status: existing ? 200 : 201, contentType: "application/json", body: JSON.stringify(row) });
  });
}

async function compose(page: Page, text: string) {
  const input = page.getByLabel("Message", { exact: true });
  await input.tap();
  await input.fill(text);
}

test("buyer and seller exchange persisted messages without navigation or refresh", async ({ browser }) => {
  test.setTimeout(60_000);
  const messages: StoredMessage[] = [];
  const buyerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const sellerContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const buyer = await buyerContext.newPage();
  const seller = await sellerContext.newPage();
  await installMessageService(buyer, messages);
  await installMessageService(seller, messages);

  try {
    await Promise.all([
      buyer.goto("/test-harness/chat?viewer=account-a"),
      seller.goto("/test-harness/chat?viewer=account-b"),
    ]);
    await compose(buyer, "Hello, is this available?");
    await buyer.getByRole("button", { name: "Send message" }).tap();
    await expect(buyer.getByRole("log", { name: "Messages" }).getByText("Hello, is this available?", { exact: true })).toBeVisible();
    await expect(buyer.locator('[data-message-status="sent"]')).toContainText("Hello, is this available?");
    await expect(buyer).toHaveURL(/viewer=account-a$/);

    await expect(seller.getByRole("log", { name: "Messages" }).getByText("Hello, is this available?", { exact: true })).toBeVisible({ timeout: 16_000 });
    await compose(seller, "Yes, it is available.");
    await seller.getByRole("button", { name: "Send message" }).tap();
    await expect(buyer.getByRole("log", { name: "Messages" }).getByText("Yes, it is available.", { exact: true })).toBeVisible({ timeout: 16_000 });
    await expect(buyer.locator('[data-message-status="sent"]')).toHaveCount(2);
    expect(messages.map((item) => [item.sender_id, item.body])).toEqual([
      ["account-a", "Hello, is this available?"],
      ["account-b", "Yes, it is available."],
    ]);
  } finally {
    await buyerContext.close();
    await sellerContext.close();
  }
});

test("pending send serializes taps and a failure remains retryable", async ({ page }) => {
  const messages: StoredMessage[] = [];
  let release!: () => void;
  const hold = new Promise<void>((resolve) => { release = resolve; });
  await installMessageService(page, messages, { holdNext: { promise: hold } });
  await page.goto("/test-harness/chat?viewer=account-a");
  await compose(page, "Only once");
  const send = page.getByRole("button", { name: "Send message" });
  await send.tap();
  await expect(page.locator('[data-message-status="pending"]')).toContainText("Only once");
  await send.dispatchEvent("click");
  release();
  await expect(page.locator('[data-message-status="sent"]')).toContainText("Only once");
  expect(messages.filter((item) => item.body === "Only once")).toHaveLength(1);

  const failNext = { value: true };
  await page.unroute("**/api/conversations/**/messages");
  await installMessageService(page, messages, { failNext });
  await compose(page, "Please retry me");
  await send.tap();
  await expect(page.locator('p[role="alert"]')).toContainText("Message could not be sent");
  await expect(page.locator('[data-message-status="failed"]')).toContainText("Please retry me");
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Please retry me");
  await page.getByRole("button", { name: "Retry" }).tap();
  await expect(page.locator('[data-message-status="sent"]').filter({ hasText: "Please retry me" })).toBeVisible();
  expect(messages.filter((item) => item.body === "Please retry me")).toHaveLength(1);
});

test("Safari without crypto.randomUUID keeps accepted messages sent", async ({ page }) => {
  const messages: StoredMessage[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });
  });
  await installMessageService(page, messages);
  await page.goto("/test-harness/chat?viewer=account-a");
  await expect.poll(() => page.evaluate(() => typeof crypto.randomUUID)).toBe("undefined");

  await compose(page, "Accepted without randomUUID");
  await page.getByRole("button", { name: "Send message" }).tap();
  await expect(page.locator('[data-message-status="sent"]').filter({ hasText: "Accepted without randomUUID" })).toBeVisible();
  await expect(page.locator('[data-message-status="failed"]')).toHaveCount(0);
  await expect(page.locator('p[role="alert"]')).toHaveCount(0);

  await compose(page, "Uses a fresh fallback UUID");
  await page.getByRole("button", { name: "Send message" }).tap();
  await expect(page.locator('[data-message-status="sent"]').filter({ hasText: "Uses a fresh fallback UUID" })).toBeVisible();
  expect(messages).toHaveLength(2);
  expect(messages[0].client_id).not.toBe(messages[1].client_id);
  expect(messages[1].client_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(pageErrors.filter((message) => message.includes("randomUUID"))).toEqual([]);
});

test("reconnect reconciliation is ordered, deduplicated, and account scoped", async ({ page }) => {
  const messages: StoredMessage[] = [];
  await installMessageService(page, messages);
  await page.goto("/test-harness/chat?viewer=account-a");
  await page.locator('form[data-hydrated="true"]').waitFor();
  messages.push({
    id: "55555555-5555-4555-8555-555555555555",
    conversation_id: conversationId,
    sender_id: "account-b",
    body: "Missed while offline",
    client_id: "66666666-6666-4666-8666-666666666666",
    created_at: "2026-10-20T08:05:00.000Z",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByRole("log", { name: "Messages" }).getByText("Missed while offline", { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByRole("log", { name: "Messages" }).getByText("Missed while offline", { exact: true })).toHaveCount(1);

  messages.splice(0, messages.length);
  await page.goto("/test-harness/chat?viewer=account-b");
  await expect(page.getByRole("log", { name: "Messages" }).getByText("Missed while offline", { exact: true })).toHaveCount(0);
});

test("WebKit can native-POST a message before hydration", async ({ browser, browserName }) => {
  test.skip(browserName !== "webkit", "The no-hydration fallback targets iPhone Safari");
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  let method = "";
  let body = "";
  await page.route("**/api/conversations/**/messages", async (route) => {
    method = route.request().method();
    body = route.request().postData() ?? "";
    await route.fulfill({ status: 204 });
  });
  await page.goto("/test-harness/chat?viewer=account-a", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Message", { exact: true }).fill("Native iPhone message");
  await page.getByRole("button", { name: "Send message" }).tap({ noWaitAfter: true });
  await expect.poll(() => body).toContain("Native+iPhone+message");
  expect(method).toBe("POST");
  expect(body).toContain("clientId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  await context.close();
});

