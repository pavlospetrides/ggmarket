import { defineConfig } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.loadEnvFile?.(".env.local");
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: join(tmpdir(), "ggmarket-playwright-results"),
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium", channel: "chrome" } },
    {
      name: "webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ?? "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER !== "false",
    timeout: 120_000,
  },
});
