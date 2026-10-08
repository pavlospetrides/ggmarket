import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const viewports = [
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
];

test("public marketplace layouts fit mobile and desktop viewports", async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase E2E environment is missing");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: listing, error: listingError } = await admin.from("listings").select("id,seller_id").eq("status", "active").limit(1).single();
  if (listingError || !listing) throw new Error("A real active listing is required for responsive verification");
  const { data: profile, error: profileError } = await admin.from("profiles").select("username").eq("id", listing.seller_id).single();
  if (profileError || !profile) throw new Error("The active listing seller profile is missing");

  const routes = ["/", "/marketplace", "/search?q=gaming", `/listing/${listing.id}`, `/profile/${profile.username}`];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect.soft(response?.ok(), `${route} should load at ${viewport.width}x${viewport.height}`).toBe(true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect.soft(overflow, `${route} horizontal overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
    }

    const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
    const desktopNav = page.getByRole("navigation", { name: "Main navigation" });
    if (viewport.width < 768) {
      await expect(mobileNav).toBeVisible();
      await expect(desktopNav).toBeHidden();
    } else {
      await expect(mobileNav).toBeHidden();
      await expect(desktopNav).toBeVisible();
    }
  }
});
