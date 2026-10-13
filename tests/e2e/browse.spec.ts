import { expect, test } from "@playwright/test";
import { createClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = Date.now();
let seller: User;
const listingIds: string[] = [];

test.beforeAll(async () => {
  const created = await admin.auth.admin.createUser({
    email: `ggmarket.browse.${stamp}@example.invalid`,
    password: `Gg!${crypto.randomUUID()}aA1`,
    email_confirm: true,
    user_metadata: { username: `browse_${String(stamp).slice(-8)}`, display_name: "Browse Test Seller" },
  });
  if (created.error || !created.data.user) throw created.error;
  seller = created.data.user;
  const category = await admin.from("categories").select("id").eq("active", true).limit(1).single();
  if (category.error) throw category.error;
  const rows = Array.from({ length: 5 }, (_, index) => ({
    seller_id: seller.id,
    category_id: category.data.id,
    title: `Browse discovery listing ${stamp}-${index}`,
    description: "Controlled active listing for Browse carousel interaction verification.",
    price: 80 + index * 25,
    currency: "EUR",
    condition: "good",
    status: "active",
    location: "QA City",
    shipping_available: true,
    meetup_available: false,
    view_count: 50 - index,
    attributes: {},
  }));
  const inserted = await admin.from("listings").insert(rows).select("id");
  if (inserted.error) throw inserted.error;
  listingIds.push(...inserted.data.map((listing) => listing.id));
});

test.afterAll(async () => {
  if (listingIds.length) await admin.from("listings").delete().in("id", listingIds);
  if (seller) await admin.auth.admin.deleteUser(seller.id);
});

test("Browse is a distinct discovery experience with working navigation", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize(
    testInfo.project.name === "webkit"
      ? { width: 390, height: 844 }
      : { width: 1440, height: 900 },
  );

  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();

  if (testInfo.project.name === "webkit")
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Browse" }).click();
  else
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Browse" }).click();
  await expect(page).toHaveURL("/browse");
  await expect(page.getByRole("region", { name: "Featured discoveries" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Filters" })).toHaveCount(0);

  const hero = page.getByRole("region", { name: "Featured discoveries" });
  const expectedSlides = [
    { title: "Find your next gaming obsession.", asset: "browse-fresh-drops.webp", href: "/marketplace?sort=newest" },
    { title: "More frames. Better plays.", asset: "browse-pc-performance.webp", href: "/marketplace?category=pc-components" },
    { title: "Pick your next platform.", asset: "browse-console-corner.webp", href: "/marketplace?category=consoles" },
    { title: "Old school. Still legendary.", asset: "browse-retro-vault.webp", href: "/marketplace?category=retro" },
  ];
  const renderedSources = new Set<string>();
  for (const [index, expectedSlide] of expectedSlides.entries()) {
    const dot = page.getByRole("button", { name: new RegExp(`Show slide ${index + 1}:`) });
    await dot.click();
    await expect(dot).toHaveAttribute("aria-current", "true");
    await expect(hero.getByRole("heading", { name: expectedSlide.title })).toBeVisible();
    await expect(hero.getByRole("link")).toHaveAttribute("href", expectedSlide.href);
    const image = hero.locator("img");
    await expect(image).toHaveAttribute("alt", /\S+/);
    await expect.poll(() => image.evaluate((element) => {
      const renderedImage = element as HTMLImageElement;
      return renderedImage.complete && renderedImage.naturalWidth > 0;
    })).toBe(true);
    const source = await image.getAttribute("src");
    expect(source).toContain(expectedSlide.asset);
    renderedSources.add(source!);
  }
  expect(renderedSources.size).toBe(expectedSlides.length);

  const freshRail = page.getByRole("region", { name: "Fresh drops listings" });
  await expect(freshRail).toBeVisible();
  const railBox = await freshRail.boundingBox();
  expect(railBox).toBeTruthy();
  if (testInfo.project.name === "webkit")
    await freshRail.evaluate((element) => element.scrollBy({ left: 320, behavior: "instant" }));
  else {
    await page.mouse.move(railBox!.x + railBox!.width / 2, railBox!.y + railBox!.height / 2);
    await page.mouse.wheel(320, 0);
  }
  await expect.poll(() => freshRail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  const category = page.locator('a[href^="/marketplace?category="]').first();
  await expect(category).toBeVisible();
  await category.click();
  await expect(page).toHaveURL(/\/marketplace\?category=/);

  await page.goto("/browse");
  const newestLink = page.locator('a[href="/marketplace?sort=newest"]').first();
  if (await newestLink.count()) {
    await newestLink.click();
    await expect(page).toHaveURL(/\/marketplace\?sort=newest/);
  }

  await page.goto("/browse");
  const listingLink = page.locator('a[aria-label^="View "]').first();
  if (await listingLink.count()) {
    await listingLink.click();
    await expect(page).toHaveURL(/\/listing\/[0-9a-f-]{36}$/);
  }

  await page.goto("/");
  await page.locator("#hero-search").fill("gaming");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/search\?q=gaming/);
});
