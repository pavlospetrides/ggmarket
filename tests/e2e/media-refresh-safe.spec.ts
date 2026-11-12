import { expect, test } from "@playwright/test";

test.skip(process.env.E2E_UI_HARNESS !== "1", "Local fixture only; no cloud data.");
test.use({ serviceWorkers: "block" });

test("expired direct media triggers one server refresh and renders the renewed source", async ({ page, context, baseURL }) => {
  let expiredRequests = 0;
  let freshRequests = 0;
  let refreshRequests = 0;
  const optimizerRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/_next/image") optimizerRequests.push("optimizer");
    if (url.pathname === "/test-harness/media" && url.searchParams.has("_rsc")) refreshRequests++;
  });
  await page.route("**/test-harness/media-image?*", async (route) => {
    if (route.request().url().includes("20200101")) {
      expiredRequests++;
      await context.addCookies([{ name: "media-refresh-fresh", value: "1", url: new URL(baseURL!).origin }]);
      await route.fulfill({ status: 403, body: "expired fixture" });
    } else {
      freshRequests++;
      await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    }
  });
  await page.goto("/test-harness/media");
  const image = page.getByRole("img", { name: "Private listing fixture" });
  await expect(image).toHaveAttribute("src", /20990101/);
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(1);
  expect(expiredRequests).toBeGreaterThanOrEqual(1);
  expect(freshRequests).toBe(1);
  expect(refreshRequests).toBe(1);
  expect(optimizerRequests).toEqual([]);
});
