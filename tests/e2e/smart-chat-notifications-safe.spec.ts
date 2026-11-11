import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });
test.skip(process.env.E2E_UI_HARNESS !== "1", "Safe notification awareness harness is opt-in and does not mutate production data.");

const conversationA = "11111111-1111-4111-8111-111111111111";
const conversationB = "22222222-2222-4222-8222-222222222222";

async function emit(page: Page, id: string, conversationId = conversationA) {
  await page.evaluate(({ id, conversationId }) => {
    window.dispatchEvent(new CustomEvent("lootriva:test-notification", { detail: { id, conversationId } }));
  }, { id, conversationId });
}

test("suppresses only a live active foreground conversation and deduplicates delivery", async ({ page }) => {
  await page.goto("/test-harness/notification-awareness");
  await expect(page.getByTestId("harness-ready")).toHaveText("ready");
  await expect(page.getByTestId("view-state")).toHaveText(`active:${conversationA}:live`);

  await emit(page, "active-1");
  await expect(page.getByTestId("unread-count")).toHaveText("0");
  await expect(page.getByTestId("toast-title")).toHaveText("none");

  await emit(page, "other-1", conversationB);
  await expect(page.getByTestId("unread-count")).toHaveText("1");
  await expect(page.getByTestId("toast-title")).toHaveText("New message other-1");
  await emit(page, "other-1", conversationB);
  await expect(page.getByTestId("unread-count")).toHaveText("1");

  await page.getByRole("button", { name: "Disconnect chat" }).click();
  await emit(page, "disconnected-1");
  await expect(page.getByTestId("unread-count")).toHaveText("2");
  await page.getByRole("button", { name: "Reconnect chat" }).click();
  await emit(page, "reconnected-1");
  await expect(page.getByTestId("unread-count")).toHaveText("2");

  await page.getByRole("button", { name: "Leave conversation" }).click();
  await emit(page, "marketplace-1");
  await expect(page.getByTestId("unread-count")).toHaveText("3");
});

test("an unfocused chat notifies normally, then suppresses again on return", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const chat = await context.newPage();
  try {
    await chat.goto("/test-harness/notification-awareness");
    await expect(chat.getByTestId("harness-ready")).toHaveText("ready");
    await chat.evaluate(() => {
      Object.defineProperty(document, "hasFocus", { configurable: true, value: () => false });
    });

    await emit(chat, "background-1");
    await chat.evaluate(() => {
      Object.defineProperty(document, "hasFocus", { configurable: true, value: () => true });
    });
    await expect(chat.getByTestId("last-environment")).toHaveText("visible:blurred");
    await expect(chat.getByTestId("unread-count")).toHaveText("1");
    await expect(chat.getByTestId("toast-title")).toHaveText("New message background-1");

    await emit(chat, "returned-1");
    await expect(chat.getByTestId("unread-count")).toHaveText("1");
  } finally {
    await context.close();
  }
});

test("independent browser sessions do not share active-conversation suppression", async ({ browser }) => {
  const activeContext = await browser.newContext();
  const inactiveContext = await browser.newContext();
  const active = await activeContext.newPage();
  const inactive = await inactiveContext.newPage();
  try {
    await active.goto("/test-harness/notification-awareness");
    await inactive.goto("/test-harness/notification-awareness?active=0");
    await expect(active.getByTestId("harness-ready")).toHaveText("ready");
    await expect(inactive.getByTestId("harness-ready")).toHaveText("ready");
    await active.bringToFront();
    await emit(active, "session-1");
    await inactive.bringToFront();
    await emit(inactive, "session-1");

    await expect(active.getByTestId("unread-count")).toHaveText("0");
    await expect(inactive.getByTestId("unread-count")).toHaveText("1");
  } finally {
    await activeContext.close();
    await inactiveContext.close();
  }
});

test("the authorized read receipt waits until the open chat is focused", async ({ page }) => {
  let readRequests = 0;
  await page.addInitScript(() => {
    Object.defineProperty(document, "hasFocus", { configurable: true, value: () => false });
  });
  await page.route("**/api/conversations/**/messages", async (route) => {
    if (route.request().method() === "PATCH") {
      readRequests += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ messages: [] }) });
  });

  await page.goto("/test-harness/chat?viewer=account-a");
  await page.locator('form[data-hydrated="true"]').waitFor();
  await page.waitForTimeout(250);
  expect(readRequests).toBe(0);

  await page.evaluate(() => {
    Object.defineProperty(document, "hasFocus", { configurable: true, value: () => true });
    window.dispatchEvent(new Event("focus"));
  });
  await expect.poll(() => readRequests).toBeGreaterThan(0);
});
