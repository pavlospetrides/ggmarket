import type { MetadataRoute } from "next";
import { buildCanonicalUrl, CANONICAL_SITE_ORIGIN } from "../lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/auth/",
        "/favorites",
        "/forgot-password",
        "/listing/*/edit",
        "/login",
        "/messages",
        "/notifications",
        "/offline",
        "/profile$",
        "/profile/listings",
        "/register",
        "/reset-password",
        "/saved-searches",
        "/search",
        "/sell",
        "/settings",
        "/test-harness/",
        "/verify-email",
      ],
    },
    sitemap: buildCanonicalUrl("/sitemap.xml"),
    host: CANONICAL_SITE_ORIGIN,
  };
}
