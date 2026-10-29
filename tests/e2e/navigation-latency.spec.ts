import { expect, test, type Browser, type BrowserContextOptions, type Page } from "@playwright/test";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";

const SAMPLE_COUNT = 5;

type RouteName = "Home" | "Marketplace" | "Profile" | "Listing";
type Samples = Record<RouteName, number[]>;

const devices: Array<{ name: string; use: BrowserContextOptions }> = [
  { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
  {
    name: "mobile",
    use: {
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    },
  },
];

function emptySamples(): Samples {
  return { Home: [], Marketplace: [], Profile: [], Listing: [] };
}

function summarize(values: number[]) {
  const ordered = [...values].sort((left, right) => left - right);
  return {
    samples: ordered,
    median: ordered[Math.floor(ordered.length / 2)],
    p95: ordered[Math.ceil(ordered.length * 0.95) - 1],
  };
}

async function routeFixtures(page: Page) {
  await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
  const listingHref = await page.locator('a[href^="/listing/"]').first().getAttribute("href");
  expect(listingHref).toMatch(/^\/listing\/[0-9a-f-]+$/);

  await page.goto(listingHref!, { waitUntil: "domcontentloaded" });
  const profileHref = await page.locator('a[href^="/profile/"]').first().getAttribute("href");
  expect(profileHref).toMatch(/^\/profile\/[^/]+$/);

  return { listingHref: listingHref!, profileHref: profileHref! };
}

async function measureDirectLoads(
  browser: Browser,
  contextOptions: BrowserContextOptions,
  routes: Record<RouteName, string>,
) {
  const samples = emptySamples();
  for (const [name, path] of Object.entries(routes) as Array<[RouteName, string]>) {
    for (let index = 0; index < SAMPLE_COUNT; index += 1) {
      const context = await browser.newContext(contextOptions);
      const page = await context.newPage();
      const startedAt = performance.now();
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBe(true);
      await page.locator("html[data-gg-hydrated='true']").waitFor();
      samples[name].push(Math.round(performance.now() - startedAt));
      await context.close();
    }
  }
  return samples;
}

async function measureTransition(
  page: Page,
  name: RouteName,
  link: ReturnType<Page["locator"]>,
  url: string,
  ready: ReturnType<Page["locator"]>,
  samples: Samples,
) {
  await link.scrollIntoViewIfNeeded();
  const startedAt = performance.now();
  await link.evaluate((element) => (element as HTMLElement).click());
  await page.waitForURL(url);
  await ready.waitFor({ state: "visible" });
  samples[name].push(Math.round(performance.now() - startedAt));
}

async function measureClientTransitions(
  browser: Browser,
  contextOptions: BrowserContextOptions,
  listingHref: string,
  profileHref: string,
) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const samples = emptySamples();

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.locator("html[data-gg-hydrated='true']").waitFor();
    await page.waitForTimeout(300);

    await measureTransition(
      page,
      "Marketplace",
      page.locator('a[href="/marketplace"]:visible').first(),
      "**/marketplace",
      page.locator('a[href^="/listing/"]').first(),
      samples,
    );
    await page.waitForTimeout(300);

    await measureTransition(
      page,
      "Listing",
      page.locator(`a[href="${listingHref}"]:visible`).first(),
      `**${listingHref}`,
      page.locator("main h1").first(),
      samples,
    );
    await page.waitForTimeout(300);

    await measureTransition(
      page,
      "Profile",
      page.locator(`a[href="${profileHref}"]:visible`).first(),
      `**${profileHref}`,
      page.locator("main h1").first(),
      samples,
    );
    await page.waitForTimeout(300);

    await measureTransition(
      page,
      "Home",
      page.getByRole("link", { name: "GGMarket home" }).first(),
      "**/",
      page.locator("#home-heading"),
      samples,
    );
  }

  await context.close();
  return samples;
}

test("production navigation stays responsive on desktop and mobile", async ({ browser, page }) => {
  const fixtures = await routeFixtures(page);
  const routes: Record<RouteName, string> = {
    Home: "/",
    Marketplace: "/marketplace",
    Profile: fixtures.profileHref,
    Listing: fixtures.listingHref,
  };
  const report: Record<string, unknown> = {};

  for (const device of devices) {
    const direct = await measureDirectLoads(browser, device.use, routes);
    const transitions = await measureClientTransitions(
      browser,
      device.use,
      fixtures.listingHref,
      fixtures.profileHref,
    );
    report[device.name] = {
      direct: Object.fromEntries(Object.entries(direct).map(([name, values]) => [name, summarize(values)])),
      transitions: Object.fromEntries(
        Object.entries(transitions).map(([name, values]) => [name, summarize(values)]),
      ),
    };

  }

  console.log(`GG_NAVIGATION_TIMINGS=${JSON.stringify(report)}`);
  for (const device of Object.values(report) as Array<{
    transitions: Record<RouteName, ReturnType<typeof summarize>>;
  }>) {
    for (const result of Object.values(device.transitions)) {
      expect(result.p95).toBeLessThan(1_000);
    }
  }
});

test("anonymous home avoids private and query-variant background requests", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === new URL(page.url() || "http://127.0.0.1").origin || url.hostname === "127.0.0.1") {
      requests.push(`${url.pathname}${url.search}`);
    }
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  await page.waitForTimeout(1_000);

  const paths = requests.map((value) => new URL(value, "http://localhost").pathname);
  expect(paths).not.toContain("/api/notifications");
  expect(paths.some((path) => ["/messages", "/favorites", "/profile", "/sell"].includes(path))).toBe(false);
  expect(requests.some((value) => value.startsWith("/marketplace?category="))).toBe(false);
});

test("marketplace does not prefetch every taxonomy query variant", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "127.0.0.1" && url.pathname === "/marketplace") {
      requests.push(`${url.pathname}${url.search}`);
    }
  });

  await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
  await page.locator("html[data-gg-hydrated='true']").waitFor();
  await page.waitForTimeout(1_000);

  expect(requests.filter((value) => value.includes("category=")).length).toBe(0);
});

test("authenticated production navigation stays responsive", async ({ browser }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  test.skip(!supabaseUrl || !anonKey || !serviceKey, "Requires the isolated local Supabase test stack.");
  const hostname = new URL(supabaseUrl!).hostname;
  expect(["127.0.0.1", "localhost", "::1", "[::1]"]).toContain(hostname);

  const admin = createSupabaseClient(supabaseUrl!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const identity = randomUUID();
  const email = `navigation-${identity}@example.invalid`;
  const password = `Local-${randomUUID()}-Aa1!`;
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: `nav_${identity.replaceAll("-", "").slice(0, 16)}` },
  });
  expect(created.error).toBeNull();
  const userId = created.data.user?.id;
  expect(userId).toBeTruthy();

  try {
    const setup = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    let sessionCookies: Array<{ name: string; value: string }> = [];
    const sessionClient = createServerClient(supabaseUrl!, anonKey!, {
      cookieOptions: { path: "/", sameSite: "lax", secure: false },
      cookies: {
        getAll: () => [],
        setAll: (values) => {
          sessionCookies = values.map(({ name, value }) => ({ name, value }));
        },
      },
    });
    const session = await sessionClient.auth.signInWithPassword({ email, password });
    expect(session.error).toBeNull();
    expect(sessionCookies.length).toBeGreaterThan(0);
    await setup.addCookies(sessionCookies.map(({ name, value }) => ({
      name,
      value,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
    })));
    const storageState = await setup.storageState();
    await setup.close();

    const report: Record<string, unknown> = {};
    for (const device of devices) {
      const context = await browser.newContext({ ...device.use, storageState });
      const page = await context.newPage();
      const fixtures = await routeFixtures(page);
      const samples = emptySamples();

      for (let index = 0; index < SAMPLE_COUNT; index += 1) {
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.locator("html[data-gg-hydrated='true']").waitFor();
        await page.waitForTimeout(300);
        await measureTransition(
          page,
          "Marketplace",
          page.locator('a[href="/marketplace"]:visible').first(),
          "**/marketplace",
          page.locator('a[href^="/listing/"]').first(),
          samples,
        );

        await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);
        await measureTransition(
          page,
          "Listing",
          page.locator(`a[href="${fixtures.listingHref}"]:visible`).first(),
          `**${fixtures.listingHref}`,
          page.locator("main h1").first(),
          samples,
        );

        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);
        await measureTransition(
          page,
          "Profile",
          page.locator('a[href="/profile"]:visible').first(),
          "**/profile",
          page.locator("main h1").first(),
          samples,
        );

        await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);
        await measureTransition(
          page,
          "Home",
          page.getByRole("link", { name: "GGMarket home" }).first(),
          "**/",
          page.locator("#home-heading"),
          samples,
        );
      }

      report[device.name] = Object.fromEntries(
        Object.entries(samples).map(([name, values]) => [name, summarize(values)]),
      );
      await context.close();
    }
    console.log(`GG_AUTH_NAVIGATION_TIMINGS=${JSON.stringify(report)}`);
  } finally {
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
