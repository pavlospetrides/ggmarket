import { expect, test } from "@playwright/test";

const widths = [320, 360, 375, 390, 393, 430, 768, 1024, 1440, 1920] as const;
const cpuUrl = "/marketplace?category=pc-components&subcategory=cpu&manufacturer=amd&socket=am5&cpu_family=ryzen-7&cpu_generation=ryzen-7000&cpu_model=ryzen-7-7800x3d";

for (const width of widths) {
  test(`PC hardware filters remain usable at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto(cpuUrl);

    const filters = width < 768
      ? page.getByRole("dialog", { name: "Filters" })
      : page.getByRole("complementary").filter({ hasText: "Filters" });
    if (width < 768) await page.getByRole("button", { name: /^Filters/ }).click();

    await expect(filters.getByLabel("Product type")).toHaveValue("cpu");
    await expect(filters.getByLabel("Processor manufacturer")).toHaveValue("amd");
    await expect(filters.getByLabel("Socket")).toHaveValue("am5");
    await expect(filters.getByLabel("Processor family")).toHaveValue("ryzen-7");
    await expect(filters.getByLabel("Generation / series")).toHaveValue("ryzen-7000");
    await expect(filters.getByLabel("Processor model")).toHaveValue("ryzen-7-7800x3d");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.screenshot({
      path: `.taste-skill/pc-hardware/${testInfo.project.name}-${width}.png`,
      animations: "disabled",
    });
  });
}
