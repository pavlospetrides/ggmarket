import { expect, test } from "@playwright/test";

async function expectXml(page: import("@playwright/test").Page, path: string, rootElement: string) {
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-type"]).toContain("application/xml");
  expect(await response?.text()).toContain(`<${rootElement}`);
}

test("public sitemap index and advertised page sitemaps resolve as XML", async ({ page }) => {
  const indexResponse = await page.goto("/sitemap.xml");
  expect(indexResponse?.status()).toBe(200);
  expect(indexResponse?.headers()["content-type"]).toContain("application/xml");
  const indexXml = await indexResponse!.text();
  expect(indexXml).toContain("<sitemapindex");

  await expectXml(page, "/pages/sitemap.xml", "urlset");

  for (const kind of ["listings", "profiles"] as const) {
    const match = indexXml.match(new RegExp(`<loc>[^<]*/sitemaps/${kind}/(\\d+\\.xml)</loc>`));
    if (!match) continue;
    await expectXml(page, `/sitemaps/${kind}/${match[1]}`, "urlset");
  }
});
