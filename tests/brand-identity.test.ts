import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_SOCIAL_IMAGE } from "../lib/site-metadata";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("GGMarket brand identity", () => {
  it("uses the Portal Pair vector mark in the shared homepage logo", () => {
    const logo = read("components/logo.tsx");
    const mark = read("components/brand-mark.tsx");
    expect(logo).toContain("<BrandMark");
    expect(logo).toContain('aria-label="GGMarket home"');
    expect(logo).not.toContain(">GG</span>");
    expect(mark.match(/<path/g)).toHaveLength(2);
  });

  it("ships compact and horizontal light/dark vector assets", () => {
    for (const path of [
      "public/brand/ggmarket-mark-dark.svg",
      "public/brand/ggmarket-mark-light.svg",
      "public/brand/ggmarket-logo-dark.svg",
      "public/brand/ggmarket-logo-light.svg",
      "app/icon.svg",
      "app/apple-icon.png",
      "public/icon.svg",
      "public/brand/ggmarket-app-icon-512.png",
      "public/brand/ggmarket-open-graph.svg",
      "public/brand/ggmarket-open-graph.png",
    ]) expect(existsSync(new URL(`../${path}`, import.meta.url)), path).toBe(true);
  });

  it("uses the new symbol for large footer branding and app metadata", () => {
    expect(read("components/site-footer.tsx")).toContain('<BrandMark className="footer-symbol"');
    expect(read("app/layout.tsx")).toContain("<SiteFooter />");
    expect(read("app/globals.css")).toContain(".footer-symbol { width: 4rem;");
    expect(read("app/globals.css")).toContain("font-size: clamp(2.2rem, 10.5vw, 3rem)");
    expect(read("app/manifest.ts")).toContain('/brand/ggmarket-mark-dark.svg');
    expect(DEFAULT_SOCIAL_IMAGE.url).toBe("https://ggmarket.eu/brand/ggmarket-open-graph.png");
  });
});
