function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || "";
}

export const PRODUCTION_SITE_ORIGIN = "https://ggmarket-sage.vercel.app";

export function isTrustedMutationRequest(headers: Headers, fallbackProtocol: string) {
  const origin = headers.get("origin");
  const fetchSite = headers.get("sec-fetch-site");
  if (!origin) return fetchSite === "same-origin";

  const requestOrigin = getPublicRequestOrigin(headers, fallbackProtocol);
  if (!requestOrigin) return false;

  try {
    return new URL(origin).origin === requestOrigin;
  } catch {
    return false;
  }
}

export function getPublicRequestOrigin(headers: Headers, fallbackProtocol: string) {
  if (process.env.NODE_ENV === "production") {
    const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      if (configuredSiteUrl && new URL(configuredSiteUrl).origin === PRODUCTION_SITE_ORIGIN) {
        return PRODUCTION_SITE_ORIGIN;
      }
    } catch {
      // Production auth redirects remain pinned to the canonical origin below.
    }
    return PRODUCTION_SITE_ORIGIN;
  }

  const host = firstHeaderValue(headers.get("x-forwarded-host")) || firstHeaderValue(headers.get("host"));
  const forwardedProtocol = firstHeaderValue(headers.get("x-forwarded-proto"));
  const protocol = (forwardedProtocol || fallbackProtocol.replace(":", "")).toLowerCase();
  if (!host || !["http", "https"].includes(protocol)) return null;

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}
