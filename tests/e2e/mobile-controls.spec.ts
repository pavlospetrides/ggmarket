import { expect, test } from "@playwright/test";
import { createClient, type User } from "@supabase/supabase-js";
import { requireMutationEnvironment } from "./mutation-guard";

const { url, anonKey, serviceKey } = requireMutationEnvironment();
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = Date.now();
const email = `ggmarket.mobile.${stamp}@example.invalid`;
const password = `Gg!${crypto.randomUUID()}aA1`;
let user: User;
let seller: User;
let listing: { id: string; title: string };
let conversationId = "";
const createdEntityIds: string[] = [];

test.beforeAll(async () => {
  if (!url || !anonKey || !serviceKey)
    throw new Error("Supabase E2E environment is missing");
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: `mobile_${String(stamp).slice(-8)}`,
      display_name: "Mobile WebKit User",
    },
  });
  if (created.error || !created.data.user) throw created.error;
  user = created.data.user;
  const createdSeller = await admin.auth.admin.createUser({
    email: `ggmarket.mobile.seller.${stamp}@example.invalid`,
    password,
    email_confirm: true,
    user_metadata: { username: `mobile_seller_${String(stamp).slice(-7)}`, display_name: "Mobile Seller" },
  });
  if (createdSeller.error || !createdSeller.data.user) throw createdSeller.error;
  seller = createdSeller.data.user;
  const category = await admin.from("categories").select("id").eq("active", true).limit(1).single();
  if (category.error) throw category.error;
  const active = await admin.from("listings").insert({ seller_id: seller.id, category_id: category.data.id, title: `Mobile acceptance listing ${stamp}`, description: "Controlled active listing for mobile mutation testing.", price: 250, currency: "EUR", condition: "good", status: "active", location: "QA City", shipping_available: true, meetup_available: false, attributes: {} }).select("id,title").single();
  if (active.error || !active.data) throw active.error;
  listing = active.data;
});

test.afterAll(async () => {
  if (conversationId)
    await admin.from("conversations").delete().eq("id", conversationId);
  if (createdEntityIds.length)
    await admin.from("notifications").delete().in("entity_id", createdEntityIds);
  if (listing?.id) await admin.from("listings").delete().eq("id", listing.id);
  if (user) await admin.auth.admin.deleteUser(user.id);
  if (seller) await admin.auth.admin.deleteUser(seller.id);
});

test("mobile controls mutate and persist through real taps", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await expect(page.locator("form[data-hydrated]")).toHaveAttribute("data-hydrated", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 });

  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await nav.getByRole("link", { name: "Browse" }).click();
  await expect(page).toHaveURL(/\/browse/);
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Find your next setup" })).toBeVisible();
  await nav.getByRole("link", { name: "Favorites" }).click();
  await expect(page).toHaveURL(/\/favorites/);
  await expect(page.getByRole("heading", { name: "Favorites" })).toBeVisible();
  await nav.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByRole("heading", { name: "Mobile WebKit User" })).toBeVisible();

  await page.goto("/marketplace");
  await page.getByRole("button", { name: "Filters" }).click();
  await expect(
    page.getByRole("dialog", { name: "Filters", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close filters" }).click();
  await expect(
    page.getByRole("dialog", { name: "Filters", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByLabel("Condition").last().selectOption("good");
  await page.getByRole("button", { name: "Apply filters" }).last().click();
  await expect(page).toHaveURL(/condition=good/);
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("link", { name: "Reset" }).last().click();
  await expect(page).toHaveURL(/\/marketplace$/);

  await page.goto(`/listing/${listing.id}`);
  const detail = page.getByRole("complementary");
  await detail.getByRole("button", { name: "Add to favorites" }).click();
  await expect(
    detail.getByRole("button", { name: "Remove from favorites" }),
  ).toBeEnabled();
  await expect.poll(async () => (await admin
    .from("favorites")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", listing.id)
    .maybeSingle()).data?.listing_id).toBe(listing.id);

  await page.reload();
  await detail.getByRole("button", { name: "Remove from favorites" }).click();
  await expect(detail.getByRole("button", { name: "Add to favorites" })).toBeEnabled();
  await expect.poll(async () => (await admin
    .from("favorites")
    .select("listing_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("listing_id", listing.id)).count).toBe(0);

  await page.getByRole("button", { name: "Report listing" }).click();
  await expect(page.getByRole("dialog", { name: "Report listing" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog", { name: "Report listing" })).toBeHidden();
  await page.getByRole("button", { name: "Report listing" }).click();
  await page.getByLabel("Details (optional)").fill("Mobile WebKit report test");
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByText("Thanks for letting us know.")).toBeVisible({
    timeout: 15_000,
  });
  const report = await admin
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("listing_id", listing.id)
    .single();
  expect(report.data?.id).toBeTruthy();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog", { name: "Report listing" })).toBeHidden();

  const adminProbe = await page.context().newPage();
  await adminProbe.goto("/admin");
  await expect(adminProbe).toHaveURL("/");
  await adminProbe.close();

  await detail.getByRole("button", { name: "Message seller" }).click();
  await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  conversationId = page.url().split("/").pop()!;
  const conversation = await admin
    .from("conversations")
    .select("id,buyer_id,listing_id")
    .eq("id", conversationId)
    .single();
  expect(conversation.data).toMatchObject({
    buyer_id: user.id,
    listing_id: listing.id,
  });
  await page.getByRole("link", { name: "Back to conversations" }).click();
  await expect(page).toHaveURL(/\/messages$/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();

  await page.goto("/saved-searches");
  const alertName = `WebKit alert ${stamp}`;
  await page.getByLabel("Alert name").fill(alertName);
  await page.getByLabel("Search term").fill("RTX");
  await page.getByRole("button", { name: "Create alert" }).click();
  await expect(page.getByRole("heading", { name: alertName })).toBeVisible();
  const saved = await admin
    .from("saved_searches")
    .select("id,enabled")
    .eq("user_id", user.id)
    .eq("name", alertName)
    .single();
  expect(saved.data?.enabled).toBe(true);
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Enable" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Enable" })).toBeVisible();
  await page.getByRole("button", { name: `Rename ${alertName}` }).click();
  await page.getByRole("textbox", { name: "Edit alert name" }).fill(`${alertName} renamed`);
  await page.getByRole("button", { name: "Save alert name" }).click();
  await expect(
    page.getByRole("heading", { name: `${alertName} renamed` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enable" }).click();
  await page.getByRole("button", { name: `Delete ${alertName} renamed` }).click();
  await page.getByRole("button", { name: "Confirm delete" }).click();
  await expect(page.getByText(`${alertName} renamed`)).toBeHidden();
  const savedCount = await admin
    .from("saved_searches")
    .select("id", { count: "exact", head: true })
    .eq("id", saved.data!.id);
  expect(savedCount.count).toBe(0);

  const seeded = await admin
    .from("notifications")
    .insert([
      {
        user_id: user.id,
        type: "moderation",
        title: `WebKit notification ${stamp}`,
        href: "/notifications",
        dedupe_key: `webkit:${stamp}:one`,
      },
      {
        user_id: user.id,
        type: "moderation",
        title: `WebKit notification second ${stamp}`,
        href: "/notifications",
        dedupe_key: `webkit:${stamp}:two`,
      },
    ])
    .select("id");
  if (seeded.error || !seeded.data) throw seeded.error;
  createdEntityIds.push(...seeded.data.map((item) => item.id));
  await page.goto("/profile");
  await page.getByRole("link", { name: "Notifications" }).click();
  await expect(page).toHaveURL(/\/notifications/);
  await page.getByRole("link", { name: `WebKit notification ${stamp}` }).click();
  await expect
    .poll(async () => {
      const firstRead = await admin
        .from("notifications")
        .select("read_at")
        .eq("id", seeded.data[0].id)
        .single();
      return firstRead.data?.read_at;
    })
    .toBeTruthy();
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect
    .poll(async () => {
      const unread = await admin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      return unread.count;
    })
    .toBe(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Mark all read" })).toBeDisabled();
});
