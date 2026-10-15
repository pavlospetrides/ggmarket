import { expect, test } from "@playwright/test";

test("Browse is search-first, navigable, and read-only", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "webkit";
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto("/browse");

  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Find what plays next" })).toBeVisible();

  if (mobile) {
    const search = page.getByRole("region", { name: "Browse marketplace" }).getByRole("search");
    await expect(search).toBeVisible();
    await expect(page.getByRole("link", { name: "Filter & sort" })).toBeVisible();
    await search.getByRole("textbox", { name: "Search marketplace" }).fill("gaming");
    await search.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/marketplace\?q=gaming/);
  } else {
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  }

  await page.goto("/browse");
  const category = page.locator('a[href^="/marketplace?category="]').first();
  await expect(category).toBeVisible();
  await category.click();
  await expect(page).toHaveURL(/\/marketplace\?category=/);

  await page.goto("/browse");
  await page.locator('a[href="/marketplace?sort=newest"]:visible').first().click();
  await expect(page).toHaveURL(/\/marketplace\?sort=newest/);

  await page.goto("/marketplace");
  await expect(page.getByRole("heading", { name: "Marketplace" })).toBeVisible();
  if (mobile) await expect(page.getByRole("button", { name: /^Filters/ })).toBeVisible();
  else await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
});

test("marketplace filters, reset links, and sorting stay URL-backed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marketplace");
  await page.getByRole("button", { name: /^Filters/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  const category = dialog.getByLabel("Category");
  const categoryOption = category.locator("option").nth(1);
  const categoryValue = await categoryOption.getAttribute("value");
  const categoryLabel = await categoryOption.textContent();
  await category.selectOption({ index: 1 });
  await expect(page).toHaveURL(new RegExp(`category=${categoryValue}`));
  await expect(page.getByRole("group", { name: "Active filters" })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(`Remove category filter: ${categoryLabel}`) }).click();
  await expect(page).not.toHaveURL(/category=/);

  await page.goto("/search?q=Ps5&condition=good");
  await page.getByLabel("Sort listings").selectOption("price-asc");
  await expect(page).toHaveURL(/\/search\?.*q=Ps5/);
  await expect(page).toHaveURL(/condition=good/);
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page).not.toHaveURL(/page=/);

  const response = await page.goto("/search?q=ps5&seller=private");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.getByLabel("Sort listings")).toHaveValue("");
  await expect(page.getByRole("link", { name: "Clear all" })).toHaveAttribute("href", "/search?q=ps5");

  await page.goto("/marketplace?seller=business");
  const renderedCards = await page.locator("article").count();
  await expect(page.getByText(new RegExp(`^${renderedCards} listings?$`))).toBeVisible();
  await expect(page.getByText("No matching listings")).toHaveCount(renderedCards === 0 ? 1 : 0);
});

test("Browse keeps search visible at the tablet breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/browse");
  await expect(page.getByRole("region", { name: "Browse marketplace" }).getByRole("search")).toBeVisible();
});

test("structured gaming paths, compatibility filters, and history are URL-backed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/marketplace?category=games&family=playstation&platform=ps5");
  await expect(page.getByRole("navigation", { name: "Category breadcrumb" })).toContainText("PlayStation 5");
  const activeFilters = page.getByRole("group", { name: "Active filters" });
  await expect(activeFilters).toContainText("PlayStation 5");
  await expect(activeFilters.getByRole("link", { name: /Remove family filter/i })).not.toHaveAttribute("href", /platform=/);

  await page.getByRole("link", { name: "PlayStation Portable (PSP)" }).click();
  await expect(page).toHaveURL(/platform=psp/);
  await page.goBack();
  await expect(page).toHaveURL(/platform=ps5/);
  await page.goForward();
  await expect(page).toHaveURL(/platform=psp/);

  await page.goto("/marketplace?category=controllers&subcategory=gamepad&compatibility=ps5");
  await expect(page.getByRole("group", { name: "Active filters" })).toContainText("PlayStation 5");
  await page.getByRole("button", { name: /^Filters/ }).click();
  const dialog = page.getByRole("dialog", { name: "Filters" });
  await expect(dialog.getByLabel("Compatible platform")).toHaveValue("ps5");

  await page.goto("/search?q=PSP+games");
  await expect(page.getByRole("navigation", { name: "Category breadcrumb" })).toContainText("PlayStation Portable (PSP)");
});

test("game family selection reveals exact consoles and removes obsolete format state", async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === "webkit" ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto("/marketplace?category=games&q=metal+gear&condition=good&physical_format=umd");
  await expect(page).not.toHaveURL(/physical_format=/);

  if (testInfo.project.name === "webkit") await page.getByRole("button", { name: /^Filters/ }).click();
  const filters = testInfo.project.name === "webkit"
    ? page.getByRole("dialog", { name: "Filters" })
    : page.getByRole("complementary").filter({ hasText: "Filters" });
  await expect(filters.getByText("Physical Format", { exact: true })).toHaveCount(0);

  await filters.getByLabel("Platform family").selectOption("playstation");
  await expect(page).toHaveURL(/family=playstation/);
  await expect(page).toHaveURL(/q=metal(?:\+|%20)gear/);
  await expect(page).toHaveURL(/condition=good/);
  const platform = filters.getByLabel("Console / Platform");
  await expect(platform).toBeVisible();
  await expect(platform).toBeFocused();
  await expect(platform.locator("option")).toHaveText([
    "All PlayStation", "PlayStation 5", "PlayStation 4", "PlayStation 3", "PlayStation 2", "PlayStation 1", "PlayStation Portable (PSP)", "PlayStation Vita",
  ]);

  await platform.selectOption("ps5");
  await expect(page).toHaveURL(/platform=ps5/);
  await expect(filters.getByLabel("Console / Platform")).toHaveValue("ps5");
  await expect(filters.getByLabel("Console / Platform")).toBeFocused();

  await filters.getByLabel("Console / Platform").selectOption("psp");
  await expect(page).toHaveURL(/platform=psp/);
  await expect(filters.getByLabel("Console / Platform")).toHaveValue("psp");
  await expect(filters.getByLabel("Console / Platform")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(filters.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Shift+Tab");
  await expect(filters.getByLabel("Console / Platform")).toBeFocused();

  await filters.getByLabel("Platform family").selectOption("xbox");
  await expect(page).toHaveURL(/family=xbox/);
  await expect(page).not.toHaveURL(/platform=psp/);
  await expect(filters.getByLabel("Console / Platform")).toBeFocused();
  await expect(filters.getByLabel("Console / Platform").locator("option")).toHaveText([
    "All Xbox", "Xbox Series X", "Xbox Series X|S", "Xbox One", "Xbox 360", "Original Xbox",
  ]);
  await filters.getByLabel("Console / Platform").selectOption("xbox-one");
  await expect(page).toHaveURL(/platform=xbox-one/);
  await expect(filters.getByLabel("Console / Platform")).toHaveValue("xbox-one");
  await expect(filters.getByLabel("Console / Platform")).toBeFocused();

  await filters.getByLabel("Platform family").selectOption("nintendo");
  await expect(page).toHaveURL(/family=nintendo/);
  await expect(page).not.toHaveURL(/platform=xbox-one/);
  await expect(filters.getByLabel("Console / Platform")).toBeFocused();
  await filters.getByLabel("Console / Platform").selectOption("switch");
  await expect(page).toHaveURL(/platform=switch/);
  await expect(filters.getByLabel("Console / Platform")).toHaveValue("switch");
  await expect(filters.getByLabel("Console / Platform")).toBeFocused();

  await filters.getByLabel("Platform family").selectOption("");
  await expect(page).not.toHaveURL(/(?:family|platform)=/);
  await expect(page).toHaveURL(/q=metal(?:\+|%20)gear/);
  await expect(page).toHaveURL(/condition=good/);
});

test("taxonomy navigation and category changes discard incompatible structured filters", async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === "webkit" ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto("/marketplace?category=pc-components&subcategory=gpu&vram_gb=12&condition=good");
  await page.getByRole("link", { name: "Processors", exact: true }).click();
  await expect(page).toHaveURL(/category=pc-components.*subcategory=cpu/);
  await expect(page).toHaveURL(/condition=good/);
  await expect(page).not.toHaveURL(/vram_gb=/);

  if (testInfo.project.name === "webkit") await page.getByRole("button", { name: /^Filters/ }).click();
  const filters = testInfo.project.name === "webkit"
    ? page.getByRole("dialog", { name: "Filters" })
    : page.getByRole("complementary").filter({ hasText: "Filters" });
  await filters.getByLabel("Category").selectOption("controllers");
  await expect(page).toHaveURL(/category=controllers/);
  await expect(page).toHaveURL(/condition=good/);
  await expect(page).not.toHaveURL(/(?:family|platform|subcategory|vram_gb)=/);
});

test("boolean taxonomy filters expose explicit Any, Yes, and No choices", async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === "webkit" ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto("/marketplace?category=peripherals&subcategory=steering-wheel");
  if (testInfo.project.name === "webkit") await page.getByRole("button", { name: /^Filters/ }).click();
  const filters = testInfo.project.name === "webkit"
    ? page.getByRole("dialog", { name: "Filters" })
    : page.getByRole("complementary").filter({ hasText: "Filters" });
  const feedback = filters.getByLabel("Force feedback");
  await expect(feedback.locator("option")).toHaveText(["Any", "Yes", "No"]);
  await feedback.selectOption("true");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/force_feedback=true/);
});

test("Browse category directory leads through games, controllers, and PC hardware", async ({ page }, testInfo) => {
  await page.setViewportSize(testInfo.project.name === "webkit" ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto("/browse");
  const directory = page.getByRole("region", { name: "Gaming category directory" });
  await directory.getByRole("link", { name: /^Games/ }).click();
  await page.getByRole("link", { name: "PlayStation", exact: true }).click();
  await page.getByRole("link", { name: "PlayStation 5", exact: true }).click();
  await expect(page).toHaveURL(/category=games.*family=playstation.*platform=ps5/);

  await page.goto("/browse");
  await directory.getByRole("link", { name: /^Controllers/ }).click();
  await page.getByRole("link", { name: "Gamepads", exact: true }).click();
  if (testInfo.project.name === "webkit") await page.getByRole("button", { name: /^Filters/ }).click();
  const filters = testInfo.project.name === "webkit" ? page.getByRole("dialog", { name: "Filters" }) : page.getByRole("complementary").filter({ hasText: "Filters" });
  await expect(filters.getByLabel("Product type")).toHaveValue("gamepad");
  await filters.getByLabel("Compatible platform").selectOption("ps5");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=controllers.*subcategory=gamepad.*compatibility=ps5/);

  await page.goto("/browse");
  await directory.getByRole("link", { name: /^PC Components/ }).click();
  await page.getByRole("link", { name: "Graphics cards", exact: true }).click();
  await expect(page).toHaveURL(/category=pc-components.*subcategory=gpu/);
  if (testInfo.project.name === "webkit") await page.getByRole("button", { name: /^Filters/ }).click();
  const gpuFilters = testInfo.project.name === "webkit" ? page.getByRole("dialog", { name: "Filters" }) : page.getByRole("complementary").filter({ hasText: "Filters" });
  await expect(gpuFilters.getByLabel("Product type")).toHaveValue("gpu");
  await gpuFilters.getByLabel("VRAM (GB)").fill("12");
  await gpuFilters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=pc-components.*subcategory=gpu.*vram_gb=12/);
});
