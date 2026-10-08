import { expect, test, type Page } from "@playwright/test";
import { createClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
const stamp = Date.now();
const password = `Gg!${crypto.randomUUID()}aA1`;
const emailA = `ggmarket.e2e.a.${stamp}@example.invalid`;
const emailB = `ggmarket.e2e.b.${stamp}@example.invalid`;
const usernameA = `e2e_a_${String(stamp).slice(-8)}`;
let userA: User;
let userB: User;
let listingId = "";

async function login(page: Page, email: string) {
  const authEvents: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/auth/"))
      authEvents.push(`request ${request.method()} ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.url().includes("/auth/"))
      authEvents.push(`response ${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => {
    if (request.url().includes("/auth/"))
      authEvents.push(
        `failed ${request.failure()?.errorText ?? "unknown"} ${request.url()}`,
      );
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  try {
    await expect(page).toHaveURL(/\/profile/, { timeout: 20_000 });
  } catch {
    const alert = await page.getByRole("alert").first().textContent();
    throw new Error(
      `Browser login did not navigate. Alert: ${alert ?? "none"}. Auth events: ${authEvents.join(" | ") || "none"}`,
    );
  }
}

async function logout(page: Page) {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/");
}

test.beforeAll(async () => {
  if (!url || !anonKey || !serviceKey)
    throw new Error("Supabase E2E environment is missing");
  const a = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: { username: usernameA, display_name: "E2E User A" },
  });
  if (a.error || !a.data.user) throw a.error;
  userA = a.data.user;
  const b = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: {
      username: `e2e_b_${String(stamp).slice(-8)}`,
      display_name: "E2E User B",
    },
  });
  if (b.error || !b.data.user) throw b.error;
  userB = b.data.user;
  const check = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await check.auth.signInWithPassword({
    email: emailA,
    password,
  });
  if (error) throw new Error(`Test user cannot sign in: ${error.message}`);
  await check.auth.signOut();
});

test.afterAll(async () => {
  if (listingId && userA) {
    const { data: objects } = await admin.storage
      .from("listing-images")
      .list(`${userA.id}/${listingId}`);
    if (objects?.length)
      await admin.storage
        .from("listing-images")
        .remove(
          objects.map((object) => `${userA.id}/${listingId}/${object.name}`),
        );
  }
  const ids = [userA?.id, userB?.id].filter(Boolean);
  if (ids.length) {
    await admin.from("reports").delete().in("reporter_id", ids);
    await admin.from("listings").delete().in("seller_id", ids);
  }
  if (userA) await admin.auth.admin.deleteUser(userA.id);
  if (userB) await admin.auth.admin.deleteUser(userB.id);
});

test("real Supabase-backed Phase 1 flow", async ({ page }, testInfo) => {
  await login(page, emailA);

  if (testInfo.project.name === "webkit") {
    const mobileNav = page.getByRole("navigation", {
      name: "Mobile navigation",
    });
    await mobileNav.getByRole("link", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search/);
    await mobileNav.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
    await mobileNav.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile/);
    await page.getByRole("link", { name: "Edit profile" }).click();
  } else {
    await page.goto("/settings");
  }

  await page.getByLabel("Display name").fill("E2E Seller Updated");
  await page.getByLabel("Username").fill(usernameA);
  await page.getByLabel("Location").fill("E2E City");
  await page.getByLabel("Bio").fill("Automated release verification account.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue(
    "E2E Seller Updated",
  );
  const { data: persistedProfile } = await admin
    .from("profiles")
    .select("display_name,location,bio")
    .eq("id", userA.id)
    .single();
  expect(persistedProfile).toMatchObject({
    display_name: "E2E Seller Updated",
    location: "E2E City",
    bio: "Automated release verification account.",
  });

  if (testInfo.project.name === "webkit")
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Sell" })
      .click();
  else await page.goto("/sell");
  await page.locator('label:has(input[name="categoryId"])').first().click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.locator('input[name="categoryId"]:checked')).toHaveCount(1);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Product or model").fill("E2E Test Console");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await page.locator('input[type="file"]').setInputFiles([
    { name: "e2e-one.png", mimeType: "image/png", buffer: png },
    { name: "e2e-two.png", mimeType: "image/png", buffer: png },
  ]);
  await page.getByRole("button", { name: "Remove photo 1" }).click();
  await expect(page.getByRole("button", { name: /Remove photo/ })).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const originalTitle = `E2E Gaming Console ${stamp}`;
  await page.getByLabel("Listing title").fill(originalTitle);
  await page
    .getByLabel("Description")
    .fill("Automated end-to-end test listing with multiple uploaded images.");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel(/^Price/).fill("321");
  await page.getByLabel("Location").fill("E2E City");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /Publish/ }).click();
  await expect(page).toHaveURL(/\/listing\/[0-9a-f-]{36}$/, {
    timeout: 30_000,
  });
  listingId = page.url().split("/").pop()!;
  await expect(
    page.getByRole("heading", { name: originalTitle }),
  ).toBeVisible();
  await expect(page.locator('img[alt^="E2E Gaming Console"]')).toBeVisible();
  const { data: publishedListing } = await admin
    .from("listings")
    .select("title,status")
    .eq("id", listingId)
    .single();
  expect(publishedListing).toMatchObject({
    title: originalTitle,
    status: "active",
  });

  await page.goto("/marketplace");
  await expect(page.getByText(originalTitle)).toBeVisible();
  if (testInfo.project.name === "webkit") {
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByLabel("Condition").last().selectOption("good");
    await page.getByRole("button", { name: "Apply filters" }).last().click();
    await expect(page).toHaveURL(/condition=good/);
    await page.getByRole("button", { name: "Filters" }).click();
    await page.getByRole("link", { name: "Reset" }).click();
    await expect(page).toHaveURL(/\/marketplace$/);
  }
  await page.goto(`/search?q=${encodeURIComponent("E2E Gaming Console")}`);
  await expect(page.getByText(originalTitle)).toBeVisible();
  await page.getByRole("link", { name: `View ${originalTitle}` }).click();
  await expect(
    page.getByRole("heading", { name: originalTitle }),
  ).toBeVisible();
  await page.goto(`/profile/${usernameA}`);
  await expect(
    page.getByRole("heading", { name: "E2E Seller Updated" }),
  ).toBeVisible();
  await expect(page.getByText(originalTitle)).toBeVisible();

  await logout(page);
  await login(page, emailB);
  await page.goto(`/listing/${listingId}`);
  const detailPanel = page.getByRole("complementary");
  await detailPanel.getByRole("button", { name: "Add to favorites" }).click();
  await expect(
    detailPanel.getByRole("button", { name: "Remove from favorites" }),
  ).toBeEnabled();
  const { data: favoriteRow } = await admin
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userB.id)
    .eq("listing_id", listingId)
    .single();
  expect(favoriteRow?.listing_id).toBe(listingId);
  await page.goto("/favorites");
  await expect(page.getByText(originalTitle)).toBeVisible();
  await page.reload();
  await expect(page.getByText(originalTitle)).toBeVisible();
  await page.getByRole("button", { name: "Remove from favorites" }).click();
  await expect(page.getByText(originalTitle)).not.toBeVisible();
  const { count: favoriteCount } = await admin
    .from("favorites")
    .select("listing_id", { count: "exact", head: true })
    .eq("user_id", userB.id)
    .eq("listing_id", listingId);
  expect(favoriteCount).toBe(0);

  await page.goto(`/listing/${listingId}`);
  await page.getByRole("button", { name: "Report listing" }).click();
  await page
    .getByLabel("Details (optional)")
    .fill("Automated moderation flow test.");
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByText("Thanks for letting us know.")).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL("/");

  const clientB = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  await clientB.auth.signInWithPassword({ email: emailB, password });
  const { data: forbiddenEdit } = await clientB
    .from("listings")
    .update({ price: 1 })
    .eq("id", listingId)
    .select("id");
  expect(forbiddenEdit).toHaveLength(0);
  const { data: forbiddenProfile } = await clientB
    .from("profiles")
    .update({ display_name: "Tampered" })
    .eq("id", userA.id)
    .select("id");
  expect(forbiddenProfile).toHaveLength(0);

  await logout(page);
  await login(page, emailA);
  await page.goto(`/listing/${listingId}/edit`);
  const editedTitle = `${originalTitle} Updated`;
  await page.getByLabel("Title").fill(editedTitle);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Listing updated")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Title")).toHaveValue(editedTitle);
  await page.goto(`/listing/${listingId}`);
  await expect(page.getByRole("heading", { name: editedTitle })).toBeVisible();
});
