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

test("conversation owns the viewport and only its message history scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const messages: StoredMessage[] = Array.from({ length: 60 }, (_, index) => ({
    id: `${String(index + 1).padStart(8, "0")}-1111-4111-8111-111111111111`,
    conversation_id: conversationId,
    sender_id: index % 2 ? "account-a" : "account-b",
    body: `Long conversation message ${index + 1} ${"content ".repeat(12)}`,
    client_id: `${String(index + 1).padStart(8, "0")}-2222-4222-8222-222222222222`,
    created_at: new Date(Date.UTC(2026, 9, 20, 8, index)).toISOString(),
  }));
  await installMessageService(page, messages);
  await page.goto("/test-harness/chat?viewer=account-a");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event("online")));

  const log = page.getByRole("log", { name: "Messages" });
  const composer = page.getByLabel("Message", { exact: true });
  await expect(log).toBeVisible();
  await expect(log.getByText("Long conversation message 60", { exact: false })).toBeVisible();
  await expect(composer).toBeVisible();
  await expect(page.getByText("Propose a trade", { exact: true })).toBeVisible();
  await expect(page.getByText("Make an offer", { exact: true })).toBeVisible();
  await expect(page.locator("[data-site-footer]")).toBeHidden();
  await expect(page.getByRole("link", { name: "Back to conversations" })).toHaveAttribute("href", "/messages");

  const readLayout = () => page.evaluate(() => {
    const rect = (selector: string) => {
      const bounds = (document.querySelector(selector) as HTMLElement).getBoundingClientRect();
      return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left, width: bounds.width, height: bounds.height };
    };
    const history = document.querySelector('[role="log"]') as HTMLElement;
    const viewport = window.visualViewport;
    return {
      viewport: { width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight },
      header: rect("[data-conversation-header]"),
      history: rect('[role="log"]'),
      composer: rect("[data-message-composer]"),
      input: rect("#chat-message"),
      send: rect('[aria-label="Send message"]'),
      document: { scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight },
      body: { scrollHeight: document.body.scrollHeight, clientHeight: document.body.clientHeight, bounds: document.body.getBoundingClientRect().height },
      main: rect("main"),
      pageScrollable: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      historyScrollable: history.scrollHeight > history.clientHeight,
      overflowY: getComputedStyle(history).overflowY,
      scrollY: window.scrollY,
    };
  });

  const assertContained = async (label: string) => {
    const layout = await readLayout();
    expect(layout.pageScrollable, `${label}: document must not scroll (${JSON.stringify({ viewport: layout.viewport, document: layout.document, body: layout.body, main: layout.main, composer: layout.composer })})`).toBe(false);
    expect(layout.horizontalOverflow, `${label}: document must not overflow horizontally`).toBe(false);
    expect(layout.historyScrollable, `${label}: message history must scroll`).toBe(true);
    expect(layout.overflowY, `${label}: history overflow`).toBe("auto");
    expect(layout.scrollY, `${label}: document scroll position`).toBe(0);
    expect(layout.header.top, `${label}: conversation header top`).toBeGreaterThanOrEqual(-1);
    expect(layout.header.bottom, `${label}: conversation header bottom`).toBeLessThanOrEqual(layout.viewport.height + 1);
    expect(layout.history.top, `${label}: history follows header`).toBeGreaterThanOrEqual(layout.header.bottom - 1);
    expect(layout.history.height, `${label}: history has space`).toBeGreaterThan(0);
    expect(layout.history.bottom, `${label}: history ends before composer`).toBeLessThanOrEqual(layout.composer.top + 1);
    for (const [name, bounds] of [["composer", layout.composer], ["message input", layout.input], ["send button", layout.send]] as const) {
      expect(bounds.left, `${label}: ${name} left`).toBeGreaterThanOrEqual(-1);
      expect(bounds.right, `${label}: ${name} right`).toBeLessThanOrEqual(layout.viewport.width + 1);
      expect(bounds.top, `${label}: ${name} top`).toBeGreaterThanOrEqual(-1);
      expect(bounds.bottom, `${label}: ${name} bottom (${JSON.stringify({ viewport: layout.viewport, document: layout.document, body: layout.body, main: layout.main, header: layout.header, history: layout.history, composer: layout.composer })})`).toBeLessThanOrEqual(layout.viewport.height + 1);
    }
  };

  await assertContained("390x844 initial layout");
  await page.evaluate(() => window.scrollTo(0, 10_000));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  for (const { width, height } of [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 393, height: 852 },
    { width: 430, height: 932 },
    { width: 667, height: 375 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--conversation-viewport-height"))).toBe(`${height}px`);
    await assertContained(`${width}x${height}`);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--conversation-viewport-height"))).toBe("844px");
  await compose(page, "Composer remains visible after sending");
  await page.getByRole("button", { name: "Send message" }).tap();
  await expect(log.getByText("Composer remains visible after sending", { exact: true })).toBeVisible();
  await assertContained("after optimistic and persisted send");

  messages.push({
    id: "99999999-9999-4999-8999-999999999999",
    conversation_id: conversationId,
    sender_id: "account-b",
    body: "Incoming message keeps the composer contained",
    client_id: "88888888-8888-4888-8888-888888888888",
    created_at: "2026-10-20T10:00:00.000Z",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(log.getByText("Incoming message keeps the composer contained", { exact: true })).toBeVisible();
  await assertContained("after incoming message");

  await page.setViewportSize({ width: 390, height: 560 });
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--conversation-viewport-height"))).toBe("560px");
  await composer.tap();
  await assertContained("keyboard-sized visual viewport");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--conversation-viewport-height"))).toBe("844px");
  await assertContained("after keyboard-sized viewport restores");
});

