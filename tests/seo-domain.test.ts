import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../app/manifest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import {
  DEFAULT_SOCIAL_IMAGE,
  PUBLIC_PAGE_SOCIAL_METADATA,
  buildSocialMetadata,
} from "../lib/site-metadata";
import { CANONICAL_SITE_ORIGIN } from "../lib/site-url";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("canonical SEO URLs", () => {
  const publicRoutes = [
    ["home", "app/page.tsx", "/", "GGMarket", "Buy. Sell. Trade. Upgrade."],
    ["browse", "app/browse/page.tsx", "/browse", "Browse gaming gear", "Discover fresh gaming gear, popular listings, retro finds, trades, and wanted posts on GGMarket."],
    ["marketplace", "app/marketplace/page.tsx", "/marketplace", "Gaming marketplace", "Browse gaming hardware, consoles, games, accessories, trades, and wanted listings on GGMarket."],
    ["privacy", "app/privacy/page.tsx", "/privacy", "Privacy policy", "How GGMarket handles account, marketplace, and session information."],
    ["cookies", "app/cookies/page.tsx", "/cookies", "Cookie policy", "How GGMarket uses essential authentication cookies and browser storage."],
  ] as const;

  it.each(publicRoutes)("resolves complete %s canonical and social metadata", (key, file, route, title, description) => {
    const canonicalUrl = new URL(route, `${CANONICAL_SITE_ORIGIN}/`).toString();
    expect(PUBLIC_PAGE_SOCIAL_METADATA[key]).toEqual({
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title,
        description,
        type: "website",
        url: canonicalUrl,
        siteName: "GGMarket",
        images: [DEFAULT_SOCIAL_IMAGE],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [DEFAULT_SOCIAL_IMAGE.url],
      },
    });
    expect(read(file)).toContain(`PUBLIC_PAGE_SOCIAL_METADATA.${key}`);
  });

  it("keeps the root metadata base on the canonical production origin", () => {
    expect(read("app/layout.tsx")).toContain("metadataBase: new URL(CANONICAL_SITE_ORIGIN)");
    expect(CANONICAL_SITE_ORIGIN).toBe("https://ggmarket.eu");
  });

  it("publishes only public canonical routes in the sitemap", () => {
    const entries = sitemap();
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://ggmarket.eu",
      "https://ggmarket.eu/browse",
      "https://ggmarket.eu/marketplace",
      "https://ggmarket.eu/privacy",
      "https://ggmarket.eu/cookies",
    ]);
    expect(entries.every((entry) => entry.url.startsWith(CANONICAL_SITE_ORIGIN))).toBe(true);
  });

  it("advertises the canonical sitemap and excludes private and test surfaces", () => {
    const rules = robots();
    expect(rules.host).toBe("https://ggmarket.eu");
    expect(rules.sitemap).toBe("https://ggmarket.eu/sitemap.xml");
    expect(rules.rules).toEqual(expect.objectContaining({
      userAgent: "*",
      allow: "/",
      disallow: expect.arrayContaining(["/api/", "/admin", "/messages", "/test-harness/"]),
    }));
  });

  it("keeps the PWA launch URL same-origin", () => {
    expect(manifest().start_url).toBe("/");
  });

  it("builds complete route-specific listing and seller sharing metadata", () => {
    expect(buildSocialMetadata({
      title: "Console listing",
      description: "A synthetic listing description.",
      path: "/listing/listing-id",
      image: "https://images.example/listing.webp",
    })).toEqual({
      alternates: { canonical: "https://ggmarket.eu/listing/listing-id" },
      openGraph: {
        title: "Console listing",
        description: "A synthetic listing description.",
        type: "website",
        url: "https://ggmarket.eu/listing/listing-id",
        siteName: "GGMarket",
        images: ["https://images.example/listing.webp"],
      },
      twitter: {
        card: "summary_large_image",
        title: "Console listing",
        description: "A synthetic listing description.",
        images: ["https://images.example/listing.webp"],
      },
    });
    expect(buildSocialMetadata({
      title: "Synthetic Seller",
      description: "A synthetic seller profile.",
      path: "/profile/synthetic-seller",
      image: "https://images.example/avatar.webp",
      type: "profile",
    }).openGraph).toMatchObject({
      type: "profile",
      siteName: "GGMarket",
      images: ["https://images.example/avatar.webp"],
    });
    expect(read("app/listing/[id]/page.tsx")).toContain("buildSocialMetadata");
    expect(read("app/profile/[username]/page.tsx")).toContain("buildSocialMetadata");
  });

  it("shares the canonical listing URL instead of a legacy-host browser URL", () => {
    const source = read("components/listing-client-tools.tsx");
    expect(source).toContain("canonicalUrl");
    expect(source).not.toContain("url: location.href");
    expect(source).not.toContain("writeText(location.href)");
  });
});
