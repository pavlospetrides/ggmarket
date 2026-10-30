import { expect, test, type Page } from "@playwright/test";

const filteredQuery = "q=RTX+4060&category=gaming-pcs&condition=used&max=600&sort=price-asc&page=2";
const sourceCases = [
  "marketplace",
  "browse",
  "search",
  "favorites",
  "profile",
  "saved-searches",
  "recently-viewed",
] as const;
const sourceLabels: Record<(typeof sourceCases)[number], string> = {
  marketplace: "Gaming PCs",
  browse: "Browse",
  search: "Search Results",
  favorites: "Favorites",
  profile: "Seller Profile",
  "saved-searches": "Saved Searches",
  "recently-viewed": "Recently Viewed",
};

async function sourceUrl(source: string, auth = "anonymous") {
  return `/test-harness/navigation/${source}?${filteredQuery}&auth=${auth}`;
}

async function markDocument(page: Page) {
  return page.evaluate(() => {
    const marker = crypto.randomUUID();
    (window as typeof window & { __ggNavigationDocument?: string }).__ggNavigationDocument = marker;
    return marker;
  });
}

async function documentMarker(page: Page) {
  return page.evaluate(() => (window as typeof window & { __ggNavigationDocument?: string }).__ggNavigationDocument);
}

async function waitForSourceLayout(page: Page) {
  await expect.poll(() => page.getByTestId("late-layout-region").evaluate((element) => element.getBoundingClientRect().height)).toBe(640);
}

for (const source of sourceCases) {
  test(`${source} restores exact URL, state, and Listing 42 viewport with the on-screen Back control`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const protectedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (/\/(?:rest|auth)\/v1\//.test(url.pathname) || url.pathname.startsWith("/api/")) protectedRequests.push(url.pathname);
    });

    const url = await sourceUrl(source, source === "favorites" ? "synthetic-user" : "anonymous");
    await page.goto(url);
    await expect(page.getByTestId("loaded-result-count")).toHaveText("60 loaded results");
    await expect(page.getByTestId("browsing-state")).toContainText("RTX 4060");
    await expect(page.getByTestId("browsing-state")).toContainText("Price low to high");
    await waitForSourceLayout(page);
    const marker = await markDocument(page);

    const listing = page.getByRole("article", { name: "Listing 42" });
    await listing.scrollIntoViewIfNeeded();
    const before = await listing.boundingBox();
    expect(before).toBeTruthy();
    const railBefore = await page.getByTestId("listing-rail").evaluate((element) => element.scrollLeft);

    await listing.getByRole("link", { name: "Open Listing 42" }).click();
    await expect(page).toHaveURL(/\/test-harness\/navigation\/listing\/42$/);
    const backControl = page.getByRole("button", { name: `Back to ${sourceLabels[source]}` });
    await expect(backControl).toBeVisible();
    const backBox = await backControl.boundingBox();
    expect(backBox?.height).toBeGreaterThanOrEqual(44);
    expect(backBox?.width).toBeGreaterThanOrEqual(44);
    if (source === "marketplace") {
      expect(await backControl.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
      for (let index = 0; index < 12 && !(await backControl.evaluate((element) => element === document.activeElement)); index += 1) {
        await page.keyboard.press("Tab");
      }
      expect(await backControl.evaluate((element) => element === document.activeElement)).toBe(true);
      expect(await backControl.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    }
    await backControl.click();

    await expect(page).toHaveURL(new RegExp(`${source}\\?${filteredQuery.replaceAll("+", "\\+")}&auth=${source === "favorites" ? "synthetic-user" : "anonymous"}$`));
    await expect(page.getByTestId("loaded-result-count")).toHaveText("60 loaded results");
    await expect.poll(async () => {
      const after = await listing.boundingBox();
      return after && before ? Math.abs(after.y - before.y) : Number.POSITIVE_INFINITY;
    }).toBeLessThanOrEqual(2);
    await expect.poll(() => page.getByTestId("listing-rail").evaluate((element) => element.scrollLeft)).toBe(railBefore);
    expect(await documentMarker(page)).toBe(marker);
    expect(consoleErrors).toEqual([]);
    expect(protectedRequests).toEqual([]);
  });
}

test("browser Back and Forward preserve the filtered source and reusable detail context", async ({ page }) => {
  const url = await sourceUrl("search");
  await page.goto(url);
  await waitForSourceLayout(page);
  const marker = await markDocument(page);
  const listing = page.getByRole("article", { name: "Listing 42" });
  await listing.scrollIntoViewIfNeeded();
  const before = await listing.boundingBox();
  await listing.getByRole("link", { name: "Open Listing 42" }).click();
  await expect(page).toHaveURL(/\/test-harness\/navigation\/listing\/42$/);

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`search\\?${filteredQuery.replaceAll("+", "\\+")}&auth=anonymous$`));
  await expect.poll(async () => {
    const after = await listing.boundingBox();
    return after && before ? Math.abs(after.y - before.y) : Number.POSITIVE_INFINITY;
  }).toBeLessThanOrEqual(2);
  expect(await documentMarker(page)).toBe(marker);

  await page.goForward();
  await expect(page).toHaveURL(/\/listing\/42$/);
  await page.getByRole("button", { name: "Back to Search Results" }).click();
  await expect(page).toHaveURL(new RegExp(`search\\?${filteredQuery.replaceAll("+", "\\+")}&auth=anonymous$`));
});

test("related listing navigation returns to the previous listing detail", async ({ page }) => {
  await page.goto(await sourceUrl("marketplace"));
  await page.getByRole("article", { name: "Listing 42" }).getByRole("link", { name: "Open Listing 42" }).click();
  await expect(page).toHaveURL(/\/listing\/42$/);
  await page.getByRole("article", { name: "Related Listing 43" }).getByRole("link", { name: "Open Related Listing 43" }).click();
  await expect(page).toHaveURL(/\/listing\/43$/);
  await page.getByRole("button", { name: /Back to/ }).click();
  await expect(page).toHaveURL(/\/listing\/42$/);
});

test("a direct listing entry safely falls back to Marketplace", async ({ page }) => {
  await page.goto("/test-harness/navigation/listing/42");
  await page.getByRole("button", { name: "Back to Marketplace" }).click();
  await expect(page).toHaveURL(/\/marketplace$/);
});

test("refreshing a filtered source URL reproduces filters, sort, pagination, and auth mode", async ({ page }) => {
  const url = await sourceUrl("marketplace", "synthetic-user");
  await page.goto(url);
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`marketplace\\?${filteredQuery.replaceAll("+", "\\+")}&auth=synthetic-user$`));
  await expect(page.getByTestId("browsing-state")).toHaveText(
    "Query RTX 4060 · Category Gaming PCs · Condition Used · Maximum €600 · Sort Price low to high · Page 2 · Auth synthetic-user",
  );
  await expect(page.getByTestId("loaded-result-count")).toHaveText("60 loaded results");
});

test("switching synthetic accounts does not restore the previous account's source URL", async ({ page }) => {
  await page.goto(await sourceUrl("favorites", "account-a"));
  await waitForSourceLayout(page);
  await page.getByRole("article", { name: "Listing 42" }).getByRole("link", { name: "Open Listing 42" }).click();
  await expect(page.getByRole("button", { name: "Back to Favorites" })).toBeVisible();

  await page.goto(await sourceUrl("favorites", "account-b"));
  await waitForSourceLayout(page);
  await page.getByRole("article", { name: "Listing 42" }).getByRole("link", { name: "Open Listing 42" }).click();
  await page.getByRole("button", { name: "Back to Favorites" }).click();

  await expect(page).toHaveURL(/auth=account-b$/);
  await expect(page.getByTestId("browsing-state")).toContainText("Auth account-b");
  await expect(page.getByTestId("browsing-state")).not.toContainText("account-a");
});
