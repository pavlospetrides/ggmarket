import { expect, test, type Page } from "@playwright/test";
import { createClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = Date.now();
const password = `Gg!${crypto.randomUUID()}aA1`;
const emailA = `ggmarket.chat.a.${stamp}@example.invalid`;
const emailB = `ggmarket.chat.b.${stamp}@example.invalid`;
let userA: User;
let userB: User;
let listingId = "";
let conversationId = "";
let messageSellerConversationId = "";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/profile/);
}

async function typeMessage(page: Page, value: string) {
  const composer = page.locator('input[name="message"]');
  await expect(composer).toBeVisible({ timeout: 15_000 });
  await composer.click({ timeout: 15_000 });
  await composer.fill(value, { timeout: 15_000 });
}

test.beforeAll(async () => {
  if (!url || !anonKey || !serviceKey)
    throw new Error("Supabase E2E environment is missing");
  const createdA = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: {
      username: `chat_a_${String(stamp).slice(-8)}`,
      display_name: "Realtime Seller A",
    },
  });
  if (createdA.error || !createdA.data.user) throw createdA.error;
  userA = createdA.data.user;
  const createdB = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: {
      username: `chat_b_${String(stamp).slice(-8)}`,
      display_name: "Realtime Buyer B",
    },
  });
  if (createdB.error || !createdB.data.user) throw createdB.error;
  userB = createdB.data.user;

  const listing = await admin
    .from("listings")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .single();
  if (listing.error) throw listing.error;
  listingId = listing.data.id;
  const conversation = await admin
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: userB.id, seller_id: userA.id })
    .select("id")
    .single();
  if (conversation.error) throw conversation.error;
  conversationId = conversation.data.id;
  const members = await admin.from("conversation_members").insert([
    { conversation_id: conversationId, user_id: userA.id },
    { conversation_id: conversationId, user_id: userB.id },
  ]);
  if (members.error) throw members.error;
});

test.afterAll(async () => {
  if (messageSellerConversationId)
    await admin
      .from("conversations")
      .delete()
      .eq("id", messageSellerConversationId);
  if (conversationId)
    await admin.from("conversations").delete().eq("id", conversationId);
  if (userA) await admin.auth.admin.deleteUser(userA.id);
  if (userB) await admin.auth.admin.deleteUser(userB.id);
});

test("two users exchange realtime messages and offers", async ({ browser }) => {
  test.setTimeout(240_000);
  const contextA = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const contextB = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  try {
    await Promise.all([login(pageA, emailA), login(pageB, emailB)]);

    const active = await admin
      .from("listings")
      .select("id")
      .eq("status", "active")
      .neq("seller_id", userB.id)
      .limit(1)
      .single();
    if (active.error) throw active.error;
    await pageB.goto(`/listing/${active.data.id}`);
    await pageB
      .getByRole("complementary")
      .getByRole("button", { name: "Message seller" })
      .click();
    await expect(pageB).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
    messageSellerConversationId = pageB.url().split("/").pop()!;
    const started = await admin
      .from("conversations")
      .select("id,buyer_id,listing_id")
      .eq("id", messageSellerConversationId)
      .single();
    expect(started.data).toMatchObject({
      buyer_id: userB.id,
      listing_id: active.data.id,
    });
    await pageB.getByRole("link", { name: "Back to conversations" }).click();
    await expect(pageB).toHaveURL(/\/messages$/);

    await pageA.goto("/messages");
    await pageB.goto(`/messages/${conversationId}`);
    const firstBody = `Initial unread message ${stamp}`;
    await typeMessage(pageB, firstBody);
    await pageB.getByRole("button", { name: "Send message" }).click();
    await expect(pageB.getByText(firstBody)).toBeVisible();
    await expect
      .soft
      .poll(async () => {
        const firstMessage = await admin
          .from("messages")
          .select("body")
          .eq("conversation_id", conversationId)
          .eq("body", firstBody)
          .maybeSingle();
        return firstMessage.data?.body;
      })
      .toBe(firstBody);

    await pageA.reload();
    const conversationLinkA = pageA.locator(`a[href="/messages/${conversationId}"]`);
    await expect(conversationLinkA).toContainText("1");
    await conversationLinkA.click();
    await expect(pageA.getByText(firstBody)).toBeVisible();
    await expect
      .poll(async () => {
        const member = await admin
          .from("conversation_members")
          .select("last_read_at")
          .eq("conversation_id", conversationId)
          .eq("user_id", userA.id)
          .single();
        return member.data?.last_read_at;
      }, { timeout: 10_000 })
      .toBeTruthy();

    await expect(pageA.getByText("Online now")).toBeVisible({ timeout: 15_000 });
    await expect(pageB.getByText("Online now")).toBeVisible({ timeout: 15_000 });
    await typeMessage(pageB, "typing now");
    await expect(pageA.getByText(/Realtime Buyer B is typing/)).toBeVisible({
      timeout: 10_000,
    });
    await pageB.locator('input[name="message"]').fill("");

    const realtimeBody = `Realtime delivery ${stamp}`;
    await typeMessage(pageB, realtimeBody);
    await pageB.getByRole("button", { name: "Send message" }).click();
    await expect(pageA.getByText(realtimeBody)).toBeVisible({ timeout: 15_000 });
    const replyBody = `Realtime reply ${stamp}`;
    await typeMessage(pageA, replyBody);
    await pageA.getByRole("button", { name: "Send message" }).click();
    await expect(pageB.getByText(replyBody)).toBeVisible({ timeout: 15_000 });
    await pageA.reload();
    await pageB.reload();
    await expect(pageA.getByText(realtimeBody)).toBeVisible();
    await expect(pageB.getByText(replyBody)).toBeVisible();

    await pageB.getByText("Make an offer", { exact: true }).click();
    await pageB.locator('input[name="amount"]').fill("100");
    await pageB.getByRole("button", { name: "Send offer" }).click();
    await expect(pageA.getByRole("button", { name: "Accept" })).toBeVisible({
      timeout: 15_000,
    });
    const offer100 = await admin
      .from("offers")
      .select("id,status,amount")
      .eq("conversation_id", conversationId)
      .eq("amount", 100)
      .single();
    expect(offer100.data?.status).toBe("pending");
    await pageA.getByRole("button", { name: "Accept" }).click();
    await expect
      .poll(async () =>
        (
          await admin
            .from("offers")
            .select("status")
            .eq("id", offer100.data!.id)
            .single()
        ).data?.status,
      )
      .toBe("accepted");

    await pageB.getByText("Make an offer", { exact: true }).click();
    await pageB.locator('input[name="amount"]').fill("110");
    await pageB.getByRole("button", { name: "Send offer" }).click();
    await expect(pageA.getByRole("button", { name: "Decline" })).toBeVisible({
      timeout: 15_000,
    });
    await pageA.getByRole("button", { name: "Decline" }).click();
    await expect
      .poll(async () =>
        (
          await admin
            .from("offers")
            .select("status")
            .eq("conversation_id", conversationId)
            .eq("amount", 110)
            .single()
        ).data?.status,
      )
      .toBe("declined");

    await pageB.getByText("Make an offer", { exact: true }).click();
    await pageB.locator('input[name="amount"]').fill("120");
    await pageB.getByRole("button", { name: "Send offer" }).click();
    await pageB.getByRole("button", { name: "Withdraw" }).click();
    await expect
      .poll(async () =>
        (
          await admin
            .from("offers")
            .select("status")
            .eq("conversation_id", conversationId)
            .eq("amount", 120)
            .single()
        ).data?.status,
      )
      .toBe("withdrawn");

    await pageB.getByText("Make an offer", { exact: true }).click();
    await pageB.locator('input[name="amount"]').fill("130");
    await pageB.getByRole("button", { name: "Send offer" }).click();
    await expect(pageA.getByText("€130")).toBeVisible({ timeout: 15_000 });
    await pageA.getByText("Make an offer", { exact: true }).click();
    const counterOption = pageA.locator(
      'select[name="parentOfferId"] option:not([value=""])',
    ).last();
    await pageA
      .locator('select[name="parentOfferId"]')
      .selectOption((await counterOption.getAttribute("value"))!);
    await pageA.locator('input[name="amount"]').fill("125");
    await pageA.getByRole("button", { name: "Send offer" }).click();
    const offer130 = await admin
      .from("offers")
      .select("id,status")
      .eq("conversation_id", conversationId)
      .eq("amount", 130)
      .single();
    expect(offer130.data?.status).toBe("countered");
    const counter = await admin
      .from("offers")
      .select("amount,status,parent_offer_id,created_by")
      .eq("conversation_id", conversationId)
      .eq("amount", 125)
      .single();
    expect(counter.data).toMatchObject({
      status: "pending",
      parent_offer_id: offer130.data!.id,
      created_by: userA.id,
    });

    const notificationCount = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .in("user_id", [userA.id, userB.id]);
    expect(notificationCount.count).toBeGreaterThanOrEqual(6);
    await pageA.goto("/notifications");
    await expect(pageA.getByText(/New message|New offer/).first()).toBeVisible();
    await pageA.getByRole("button", { name: "Mark all read" }).click();
    await expect(pageA.getByRole("button", { name: "Mark all read" })).toBeDisabled();
    await pageB.goto("/notifications");
    await expect(pageB.getByText(/accepted|counter/i).first()).toBeVisible();
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
