import type { MetadataRoute } from "next";
import { buildCanonicalUrl, CANONICAL_SITE_ORIGIN } from "../lib/site-url";

const publicRoutes = ["", "/browse", "/marketplace", "/privacy", "/cookies"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: route ? buildCanonicalUrl(route) : CANONICAL_SITE_ORIGIN,
    changeFrequency: route === "" || route === "/marketplace" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "/marketplace" ? 0.9 : 0.6,
  }));
}
