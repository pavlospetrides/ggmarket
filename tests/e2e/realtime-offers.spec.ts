import { expect, test, type Page } from "@playwright/test";
import { createClient, type User } from "@supabase/supabase-js";
import { requireMutationEnvironment } from "./mutation-guard";

const { url, anonKey, serviceKey } = requireMutationEnvironment();
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = Date.now();
const password = `Gg!${crypto.randomUUID()}aA1`;
const emailA = `ggmarket.chat.a.${stamp}@example.invalid`;
const emailB = `ggmarket.chat.b.${stamp}@example.invalid`;
let userA: User;
let userB: User;
let listingId = "";
let ownedListingId = "";
let buyerListingId = "";
let conversationId = "";
let messageSellerConversationId = "";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/profile/);
}

async function typeMessage(page: Page, value: string) {
  const composer = page.locator('textarea[name="message"]');
  await expect(composer).toBeVisible({ timeout: 15_000 });
  await composer.click({ timeout: 15_000 });
  await composer.fill(value, { timeout: 15_000 });
}

const messageLog = (page: Page) => page.getByRole("log", { name: "Messages" });

async function openOfferForm(page: Page) {
  const amount = page.locator('input[name="amount"]');
  if (!(await amount.isVisible())) {
    await page.getByRole("button", { name: "Conversation actions" }).click();
    await page.getByRole("dialog", { name: "Conversation actions" }).getByRole("button", { name: "Make an offer" }).click();
  }
  await expect(amount).toBeVisible();
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

  const category = await admin.from("categories").select("id").eq("active", true).limit(1).single();
  if (category.error) throw category.error;
  const listing = await admin.from("listings").insert({ seller_id: userA.id, category_id: category.data.id, title: `Realtime seller listing ${stamp}`, description: "Controlled active listing for the realtime offer acceptance test.", price: 500, currency: "EUR", condition: "good", status: "active", location: "QA City", shipping_available: true, meetup_available: false, attributes: {} }).select("id").single();
  if (listing.error) throw listing.error;
  listingId = listing.data.id;
  ownedListingId = listing.data.id;
  const buyerListing = await admin.from("listings").insert({ seller_id: userB.id, category_id: category.data.id, title: `Realtime buyer trade item ${stamp}`, description: "Controlled active listing offered in the browser trade acceptance test.", price: 300, currency: "EUR", condition: "good", status: "active", location: "QA City", shipping_available: true, meetup_available: false, attributes: {} }).select("id").single();
  if (buyerListing.error) throw buyerListing.error;
  buyerListingId = buyerListing.data.id;
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
  if (ownedListingId) {
    await admin.from("notifications").delete().eq("entity_id", ownedListingId);
    await admin.from("listings").delete().eq("id", ownedListingId);
  }
  if (buyerListingId) {
    await admin.from("notifications").delete().eq("entity_id", buyerListingId);
    await admin.from("listings").delete().eq("id", buyerListingId);
  }
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
  const hydrationErrors: string[] = [];
  for (const page of [pageA, pageB])
    page.on("console", (message) => {
      if (message.type() === "error" && /hydration|server rendered html|did not match/i.test(message.text()))
        hydrationErrors.push(message.text());
    });
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
    await expect(pageB).toHaveURL(/\/messages\/[0-9a-f-]{36}$/, { timeout: 20_000 });
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
    await expect(messageLog(pageB).getByText(firstBody)).toBeVisible();
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
    await expect(messageLog(pageA).getByText(firstBody)).toBeVisible();
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
    await pageB.locator('textarea[name="message"]').fill("");

    const realtimeBody = `Realtime delivery ${stamp}`;
    await typeMessage(pageB, realtimeBody);
    await pageB.getByRole("button", { name: "Send message" }).click();
    await expect(messageLog(pageA).getByText(realtimeBody)).toBeVisible({ timeout: 15_000 });
    const replyBody = `Realtime reply ${stamp}`;
    await typeMessage(pageA, replyBody);
    await pageA.getByRole("button", { name: "Send message" }).click();
    await expect(messageLog(pageB).getByText(replyBody)).toBeVisible({ timeout: 15_000 });
    await Promise.all([pageA.goto(pageA.url()), pageB.goto(pageB.url())]);
    await expect(messageLog(pageA).getByText(realtimeBody)).toBeVisible();
    await expect(messageLog(pageB).getByText(replyBody)).toBeVisible();
    await expect(pageA.getByText("Online now")).toBeVisible({ timeout: 15_000 });
    await expect(pageB.getByText("Online now")).toBeVisible({ timeout: 15_000 });

    await openOfferForm(pageB);
    await pageB.locator('input[name="amount"]').fill("100");
    await pageB.getByRole("button", { name: "Send offer" }).click();
    await expect.poll(async () => (await admin.from("offers").select("id").eq("conversation_id", conversationId).eq("amount", 100).maybeSingle()).data?.id).toBeTruthy();
    const offer100 = await admin.from("offers").select("id,status,amount").eq("conversation_id", conversationId).eq("amount", 100).single();
    expect(offer100.data?.status).toBe("pending");
    await expect(pageA.getByRole("button", { name: "Accept" })).toBeVisible({ timeout: 15_000 });
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

    await openOfferForm(pageB);
    await pageB.locator('input[name="amount"]').fill("110");
    await pageB.getByRole("button", { name: "Send offer" }).click();
    await expect.poll(async () => (await admin.from("offers").select("id").eq("conversation_id", conversationId).eq("amount", 110).maybeSingle()).data?.id).toBeTruthy();
    await expect(pageA.getByRole("button", { name: "Decline" })).toBeVisible({ timeout: 15_000 });
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

    await openOfferForm(pageB);
    await pageB.locator('input[name="amount"]').fill("120");
    await pageB.getByRole("button", { name: "Send offer" }).click();
    await expect.poll(async () => (await admin.from("offers").select("id").eq("conversation_id", conversationId).eq("amount", 120).maybeSingle()).data?.id).toBeTruthy();
    await pageB.locator("article").filter({ hasText: "Structured offer" }).filter({ hasText: "120" }).getByRole("button", { name: "Withdraw" }).click();
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

    await openOfferForm(pageB);
    await pageB.locator('input[name="amount"]').fill("130");
    await pageB.getByRole("button", { name: "Send offer" }).click();
    await expect.poll(async () => (await admin.from("offers").select("id").eq("conversation_id", conversationId).eq("amount", 130).maybeSingle()).data?.id).toBeTruthy();
    await expect(
      pageA.locator("article").filter({ hasText: "Structured offer" }).filter({ hasText: "130" }),
    ).toBeVisible({ timeout: 15_000 });
    await openOfferForm(pageA);
    const counterOption = pageA.locator(
      'select[name="parentOfferId"] option:not([value=""])',
    ).last();
    await pageA
      .locator('select[name="parentOfferId"]')
      .selectOption((await counterOption.getAttribute("value"))!);
    await pageA.locator('input[name="amount"]').fill("125");
    await pageA.getByRole("button", { name: "Send offer" }).click();
    await expect
      .poll(async () =>
        (
          await admin
            .from("offers")
            .select("status")
            .eq("conversation_id", conversationId)
            .eq("amount", 130)
            .single()
        ).data?.status,
      )
      .toBe("countered");
    const offer130 = await admin
      .from("offers")
      .select("id,status")
      .eq("conversation_id", conversationId)
      .eq("amount", 130)
      .single();
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

    await pageB.getByRole("button", { name: "Conversation actions" }).click();
    await pageB.getByRole("dialog", { name: "Conversation actions" }).getByRole("button", { name: "Propose a trade" }).click();
    await pageB.getByLabel("Your listing").selectOption(buyerListingId);
    await pageB.getByLabel("Cash adjustment").fill("250");
    await pageB.getByLabel("Trade details").fill("Browser trade acceptance");
    await pageB.getByRole("button", { name: "Propose" }).click();
    await expect(pageB.getByRole("status")).toContainText("Trade proposal sent");
    await expect
      .poll(async () =>
        (
          await admin
            .from("trade_proposals")
            .select("status")
            .eq("conversation_id", conversationId)
            .eq("offered_listing_id", buyerListingId)
            .single()
        ).data?.status,
      )
      .toBe("pending");
    await pageA.reload();
    await expect(pageA.getByText(`Realtime buyer trade item ${stamp}`)).toBeVisible();
    await pageA.getByRole("button", { name: "Accept" }).last().click();
    await expect
      .poll(async () =>
        (
          await admin
            .from("trade_proposals")
            .select("status")
            .eq("conversation_id", conversationId)
            .eq("offered_listing_id", buyerListingId)
            .single()
        ).data?.status,
      )
      .toBe("accepted");
    await pageB.reload();
    await expect(
      pageB.locator("article").filter({ hasText: "Trade proposal" }).filter({ hasText: "accepted" }),
    ).toBeVisible();

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
    expect(hydrationErrors).toEqual([]);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
