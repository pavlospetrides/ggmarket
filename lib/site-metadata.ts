import type { Metadata } from "next";
import { buildCanonicalUrl } from "./site-url";

export const DEFAULT_SOCIAL_IMAGE = {
  url: buildCanonicalUrl("/brand/ggmarket-open-graph.png"),
  width: 1200,
  height: 630,
  alt: "GGMarket — Buy. Sell. Trade. Upgrade.",
};

type SocialMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "profile";
  twitterCard?: "summary" | "summary_large_image";
};

export function buildSocialMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  twitterCard = "summary_large_image",
}: SocialMetadataOptions): Metadata {
  const canonicalUrl = buildCanonicalUrl(path);
  const openGraphImages = [image || DEFAULT_SOCIAL_IMAGE];
  const twitterImages = [image || DEFAULT_SOCIAL_IMAGE.url];
  const commonOpenGraph = {
    title,
    description,
    url: canonicalUrl,
    siteName: "GGMarket",
    images: openGraphImages,
  };

  return {
    alternates: { canonical: canonicalUrl },
    openGraph: type === "profile"
      ? { ...commonOpenGraph, type: "profile" }
      : { ...commonOpenGraph, type: "website" },
    twitter: {
      card: twitterCard,
      title,
      description,
      images: twitterImages,
    },
  };
}

export const PUBLIC_PAGE_SOCIAL_METADATA = {
  home: buildSocialMetadata({
    title: "GGMarket",
    description: "Buy. Sell. Trade. Upgrade.",
    path: "/",
  }),
  browse: buildSocialMetadata({
    title: "Browse gaming gear",
    description: "Discover fresh gaming gear, popular listings, retro finds, trades, and wanted posts on GGMarket.",
    path: "/browse",
  }),
  marketplace: buildSocialMetadata({
    title: "Gaming marketplace",
    description: "Browse gaming hardware, consoles, games, accessories, trades, and wanted listings on GGMarket.",
    path: "/marketplace",
  }),
  privacy: buildSocialMetadata({
    title: "Privacy policy",
    description: "How GGMarket handles account, marketplace, and session information.",
    path: "/privacy",
  }),
  cookies: buildSocialMetadata({
    title: "Cookie policy",
    description: "How GGMarket uses essential authentication cookies and browser storage.",
    path: "/cookies",
  }),
} satisfies Record<string, Metadata>;

export function buildMarketplaceMetadata(category: { name: string; slug: string } | null): Metadata {
  if (!category) {
    return {
      title: "Gaming marketplace",
      description: "Browse gaming hardware, consoles, games, accessories, trades, and wanted listings on GGMarket.",
      ...PUBLIC_PAGE_SOCIAL_METADATA.marketplace,
    };
  }
  const title = `${category.name} marketplace`;
  const description = `Browse ${category.name} listings, trades, and wanted posts on GGMarket.`;
  return {
    title,
    description,
    ...buildSocialMetadata({
      title,
      description,
      path: `/marketplace?category=${encodeURIComponent(category.slug)}`,
    }),
  };
}
