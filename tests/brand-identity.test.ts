import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_SOCIAL_IMAGE } from "../lib/site-metadata";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function pngSize(path: string) {
  const image = readFileSync(new URL(`../${path}`, import.meta.url));
  expect(image.subarray(1, 4).toString()).toBe("PNG");
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

describe("Lootriva brand identity", () => {
  it("uses a path-drawn LT portal mark in the shared homepage logo", () => {
    const logo = read("components/logo.tsx");
    const mark = read("components/brand-mark.tsx");
    expect(logo).toContain("<BrandMark");
    expect(logo).toContain('aria-label="Lootriva home"');
    expect(logo).toContain(">Lootriva</span>");
    expect(mark).not.toMatch(/>\s*LT\s*</);
    expect(mark.match(/<path/g)).toHaveLength(2);
  });

  it("ships compact and horizontal light/dark vector assets", () => {
    for (const path of [
      "public/brand/lootriva-mark-dark.svg",
      "public/brand/lootriva-mark-light.svg",
      "public/brand/lootriva-logo-dark.svg",
      "public/brand/lootriva-logo-light.svg",
      "app/icon.svg",
      "app/apple-icon.png",
      "public/icon.svg",
      "public/brand/lootriva-app-icon-192.png",
      "public/brand/lootriva-app-icon-512.png",
      "public/brand/lootriva-open-graph.svg",
      "public/brand/lootriva-open-graph.png",
    ]) expect(existsSync(new URL(`../${path}`, import.meta.url)), path).toBe(true);

    for (const path of ["public/brand/lootriva-mark-dark.svg", "public/brand/lootriva-mark-light.svg"]) {
      const svg = read(path);
      expect(svg).toContain('viewBox="0 0 64 64"');
      expect(svg).toContain("Lootriva LT symbol");
      expect(svg.match(/<path/g)).toHaveLength(2);
      expect(svg).not.toMatch(/<text[^>]*>\s*LT\s*<\/text>/);
    }

    expect(pngSize("app/apple-icon.png")).toEqual({ width: 180, height: 180 });
    expect(pngSize("public/brand/lootriva-app-icon-192.png")).toEqual({ width: 192, height: 192 });
    expect(pngSize("public/brand/lootriva-app-icon-512.png")).toEqual({ width: 512, height: 512 });
    expect(pngSize("public/brand/lootriva-open-graph.png")).toEqual({ width: 1200, height: 630 });
  });

  it("uses the new symbol for large footer branding and app metadata", () => {
    expect(read("components/site-footer.tsx")).toContain('<BrandMark className="footer-symbol"');
    expect(read("app/layout.tsx")).toContain("<SiteFooter />");
    expect(read("app/globals.css")).toContain(".footer-symbol { width: 4rem;");
    expect(read("app/globals.css")).toContain("font-size: clamp(2.2rem, 10.5vw, 3rem)");
    expect(read("app/manifest.ts")).toContain('/brand/lootriva-app-icon-192.png');
    expect(read("app/manifest.ts")).toContain('/brand/lootriva-app-icon-512.png');
    expect(DEFAULT_SOCIAL_IMAGE.url).toBe("https://lootriva.com/brand/lootriva-open-graph.png");
    expect(read("components/gg-card-experience.tsx")).toContain('title="Lootriva"');
    expect(read("components/gg-card-section.tsx")).toContain("Lootriva Card");
  });

  it("uses Lootriva throughout active customer-facing source and fallback HTML", () => {
    for (const path of [
      "app/layout.tsx",
      "app/page.tsx",
      "app/browse/page.tsx",
      "app/privacy/page.tsx",
      "app/cookies/page.tsx",
      "app/register/page.tsx",
      "app/reset-password/page.tsx",
      "app/verify-email/page.tsx",
      "app/profile/[username]/page.tsx",
      "app/settings/verification/page.tsx",
      "app/api/favorites/route.ts",
      "app/api/conversations/route.ts",
      "app/api/conversations/[id]/messages/route.ts",
      "components/auth-form.tsx",
      "components/settings-form.tsx",
      "components/signup-welcome.tsx",
      "public/dev-diagnostics.js",
    ]) {
      expect(read(path), path).not.toMatch(/GGMarket|GG Market/);
    }
  });

  it("uses the Lootriva editorial hero path and keeps the source asset available", () => {
    expect(read("components/art-directed-hero-image.tsx")).toContain("/images/brand/lootriva-hero-desktop.webp");
    expect(read("app/page.tsx")).toContain("/images/brand/lootriva-hero-desktop.webp");
    expect(existsSync(new URL("../public/images/brand/lootriva-hero-desktop.webp", import.meta.url))).toBe(true);
  });
});
