import { createServer } from "node:http";
import { test, expect } from "@playwright/test";

test("an explicit empty redirect fragment clears an inherited browser secret", async ({ page }) => {
  const server = createServer((request, response) => {
    if (request.url === "/legacy") {
      response.writeHead(308, { Location: "/canonical#" });
      response.end();
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end("<!doctype html><title>Canonical</title>");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind.");

  try {
    await page.goto(`http://127.0.0.1:${address.port}/legacy#access_token=private`);
    expect(new URL(page.url()).pathname).toBe("/canonical");
    expect(page.url()).not.toContain("access_token");
    expect(page.url()).not.toContain("private");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
