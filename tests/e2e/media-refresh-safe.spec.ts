import { expect, test } from "@playwright/test";

test.skip(process.env.E2E_UI_HARNESS !== "1", "Local fixture only; no cloud data.");
test.use({ serviceWorkers: "block" });

test("expired direct media triggers one server refresh and renders the renewed source", async ({ page, context, baseURL }) => {
  let requests = 0;
  const optimizerRequests: string[] = [];
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/_next/image") optimizerRequests.push("optimizer"); });
  await page.route("**/test-harness/media-image?*", async (route) => {
    requests++;
    if (route.request().url().includes("20200101")) {
      await context.addCookies([{ name: "media-refresh-fresh", value: "1", url: baseURL! }]);
      await route.fulfill({ status: 403, body: "expired fixture" });
    } else {
      await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    }
  });
  await page.goto("/test-harness/media");
  const image = page.getByRole("img", { name: "Private listing fixture" });
  await expect(image).toHaveAttribute("src", /20990101/);
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(1);
  expect(requests).toBe(2);
  expect(optimizerRequests).toEqual([]);
});
