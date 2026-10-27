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

test("conversation follows a panned visual viewport during repeated keyboard cycles", async ({ page }) => {
  await page.addInitScript(() => {
    const metrics = { height: 844, width: 390, offsetTop: 0, offsetLeft: 0 };
    const viewport = new EventTarget();
    for (const property of ["height", "width", "offsetTop", "offsetLeft"] as const) {
      Object.defineProperty(viewport, property, {
        configurable: true,
        get: () => metrics[property],
      });
    }
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: viewport,
    });
    Object.assign(window, {
      __setConversationVisualViewport(next: Partial<typeof metrics>) {
        Object.assign(metrics, next);
        viewport.dispatchEvent(new Event("resize"));
        viewport.dispatchEvent(new Event("scroll"));
      },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await installMessageService(page, []);
  await page.goto("/test-harness/chat?viewer=account-a");
  await page.locator('form[data-hydrated="true"]').waitFor();

  const setViewport = (height: number, offsetTop: number) => page.evaluate(
    ([nextHeight, nextOffsetTop]) => {
      (window as unknown as Window & {
        __setConversationVisualViewport: (next: { height: number; offsetTop: number }) => void;
      }).__setConversationVisualViewport({ height: nextHeight, offsetTop: nextOffsetTop });
    },
    [height, offsetTop] as const,
  );
  const readViewportLayout = () => page.evaluate(() => {
    const rootStyle = document.documentElement.style;
    const bodyStyle = getComputedStyle(document.body);
    const shell = (document.querySelector("[data-conversation-shell]") as HTMLElement).getBoundingClientRect();
    const header = (document.querySelector("[data-conversation-header]") as HTMLElement).getBoundingClientRect();
    const composer = (document.querySelector("[data-message-composer]") as HTMLElement).getBoundingClientRect();
    return {
      variables: {
        height: rootStyle.getPropertyValue("--conversation-viewport-height"),
        width: rootStyle.getPropertyValue("--conversation-viewport-width"),
        top: rootStyle.getPropertyValue("--conversation-viewport-offset-top"),
        left: rootStyle.getPropertyValue("--conversation-viewport-offset-left"),
      },
      body: { position: bodyStyle.position, top: bodyStyle.top, height: bodyStyle.height },
      shell: { top: shell.top, bottom: shell.bottom, height: shell.height },
      header: { top: header.top },
      composer: { bottom: composer.bottom },
    };
  });

  await page.getByLabel("Message", { exact: true }).tap();
  for (const [height, offsetTop] of [[512, 276], [844, 0], [486, 301], [844, 0]] as const) {
    await setViewport(height, offsetTop);
    await expect.poll(readViewportLayout).toMatchObject({
      variables: {
        height: `${height}px`,
        width: "390px",
        top: `${offsetTop}px`,
        left: "0px",
      },
      body: { position: "fixed", top: `${offsetTop}px`, height: `${height}px` },
      shell: { top: offsetTop, bottom: offsetTop + height, height },
      header: { top: offsetTop },
      composer: { bottom: offsetTop + height },
    });
  }

  await page.getByRole("link", { name: "Back to conversations" }).click();
  await expect(page.locator("[data-conversation-shell]")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const style = document.documentElement.style;
    return [
      "--conversation-viewport-height",
      "--conversation-viewport-width",
      "--conversation-viewport-offset-top",
      "--conversation-viewport-offset-left",
    ].map((property) => style.getPropertyValue(property));
  })).toEqual(["", "", "", ""]);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).position)).not.toBe("fixed");

  await page.goBack();
  await expect(page.locator("[data-conversation-shell]")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--conversation-viewport-height"))).toBe("844px");
});

test("multiline composer grows without leaving the visible viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 560 });
  const messages: StoredMessage[] = Array.from({ length: 20 }, (_, index) => ({
    id: `${String(index + 1).padStart(8, "0")}-5555-4555-8555-555555555555`,
    conversation_id: conversationId,
    sender_id: index % 2 ? "account-a" : "account-b",
    body: `Composer resize message ${index + 1} ${"content ".repeat(6)}`,
    client_id: `${String(index + 1).padStart(8, "0")}-6666-4666-8666-666666666666`,
    created_at: new Date(Date.UTC(2026, 9, 20, 8, index)).toISOString(),
  }));
  await installMessageService(page, messages);
  await page.goto("/test-harness/chat?viewer=account-a");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event("online")));

  const composer = page.getByLabel("Message", { exact: true });
  const history = page.getByRole("log", { name: "Messages" });
  await expect(history.getByText("Composer resize message 20", { exact: false })).toBeVisible();
  await composer.fill([
    "First line stays visible",
    "Second line grows the composer",
    "Third line still leaves room for messages",
    "Fourth line is capped rather than pushing below the viewport",
  ].join("\n"));

  const layout = await page.evaluate(() => {
    const bounds = (selector: string) => (document.querySelector(selector) as HTMLElement).getBoundingClientRect();
    const input = bounds("#chat-message");
    const composerBounds = bounds("[data-message-composer]");
    const history = bounds('[role="log"]');
    return {
      tagName: document.querySelector("#chat-message")?.tagName,
      fontSize: getComputedStyle(document.querySelector("#chat-message") as HTMLElement).fontSize,
      input: { height: input.height, bottom: input.bottom },
      composer: { bottom: composerBounds.bottom },
      history: { height: history.height },
      viewportHeight: window.visualViewport?.height ?? window.innerHeight,
    };
  });
  expect(layout.tagName).toBe("TEXTAREA");
  expect(parseFloat(layout.fontSize)).toBeGreaterThanOrEqual(16);
  expect(layout.input.height).toBeGreaterThan(46);
  expect(layout.input.height).toBeLessThanOrEqual(128);
  expect(layout.input.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.composer.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.history.height).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
  await expect.poll(() => history.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThanOrEqual(2);
});

test("incoming messages preserve older reading positions and pin bottom readers", async ({ page }) => {
  const messages: StoredMessage[] = Array.from({ length: 60 }, (_, index) => ({
    id: `${String(index + 1).padStart(8, "0")}-3333-4333-8333-333333333333`,
    conversation_id: conversationId,
    sender_id: index % 2 ? "account-a" : "account-b",
    body: `Scroll anchor message ${index + 1} ${"history ".repeat(10)}`,
    client_id: `${String(index + 1).padStart(8, "0")}-4444-4444-8444-444444444444`,
    created_at: new Date(Date.UTC(2026, 9, 20, 8, index)).toISOString(),
  }));
  await installMessageService(page, messages);
  await page.goto("/test-harness/chat?viewer=account-a");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  const history = page.getByRole("log", { name: "Messages" });
  await expect(history.getByText("Scroll anchor message 60", { exact: false })).toBeVisible();

  await history.evaluate((element) => {
    element.scrollTop = Math.floor(element.scrollHeight / 3);
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  const readingPosition = await history.evaluate((element) => element.scrollTop);
  messages.push({
    id: "77777777-7777-4777-8777-777777777777",
    conversation_id: conversationId,
    sender_id: "account-b",
    body: "Incoming while reading older messages",
    client_id: "77777777-8888-4888-8888-888888888888",
    created_at: "2026-10-20T10:00:00.000Z",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(history.getByText("Incoming while reading older messages", { exact: true })).toBeAttached();
  await history.evaluate((element) => new Promise<void>((resolve) => {
    let previous = element.scrollTop;
    let stableFrames = 0;
    const check = () => {
      const current = element.scrollTop;
      stableFrames = Math.abs(current - previous) < 0.5 ? stableFrames + 1 : 0;
      previous = current;
      if (stableFrames >= 12) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }));
  expect(Math.abs(await history.evaluate((element) => element.scrollTop) - readingPosition)).toBeLessThanOrEqual(2);

  await history.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  messages.push({
    id: "99999999-7777-4777-8777-777777777777",
    conversation_id: conversationId,
    sender_id: "account-b",
    body: "Incoming while pinned to latest",
    client_id: "99999999-8888-4888-8888-888888888888",
    created_at: "2026-10-20T10:01:00.000Z",
  });
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(history.getByText("Incoming while pinned to latest", { exact: true })).toBeVisible();
  await expect.poll(() => history.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThanOrEqual(2);
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
  await expect(page.getByRole("button", { name: "Conversation actions" })).toBeVisible();
  await expect(page.getByText("Propose a trade", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Make an offer", { exact: true })).toHaveCount(0);
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
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
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
  const keyboardLayout = await readLayout();
  console.log(`CHAT_UX_390X560 ${JSON.stringify(keyboardLayout)}`);
  if (process.env.CHAT_UX_SCREENSHOT) {
    await page.screenshot({ path: process.env.CHAT_UX_SCREENSHOT, fullPage: false });
  }
  await assertContained("keyboard-sized visual viewport");
  expect(keyboardLayout.header.height).toBeLessThanOrEqual(68);
  expect(keyboardLayout.composer.height).toBeLessThanOrEqual(76);
  expect(keyboardLayout.history.height).toBeGreaterThanOrEqual(380);
  await expect(log.getByText("Long conversation message 60", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Conversation actions" }).tap();
  const actions = page.getByRole("dialog", { name: "Conversation actions" });
  await expect(actions).toBeVisible();
  await expect(actions.getByRole("button", { name: "Make an offer" })).toBeVisible();
  await expect(actions.getByRole("button", { name: "Propose a trade" })).toBeVisible();
  if (process.env.CHAT_UX_ACTIONS_SCREENSHOT) {
    await page.screenshot({ path: process.env.CHAT_UX_ACTIONS_SCREENSHOT, fullPage: false });
  }
  await expect.poll(() => readLayout().then((layout) => layout.composer.height)).toBe(keyboardLayout.composer.height);
  await actions.getByRole("button", { name: "Make an offer" }).tap();
  await expect(actions.getByRole("heading", { name: "Make an offer" })).toBeVisible();
  await expect(actions.getByLabel("Offer amount")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(actions).toHaveCount(0);
  await page.getByRole("button", { name: "Conversation actions" }).tap();
  await actions.getByRole("button", { name: "Propose a trade" }).tap();
  await expect(actions.getByRole("heading", { name: "Propose a trade" })).toBeVisible();
  await expect(actions.getByText("Publish an active listing before proposing an item trade.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(actions).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--conversation-viewport-height"))).toBe("844px");
  await assertContained("after keyboard-sized viewport restores");
});

