function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || "";
}

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
    if (!configuredSiteUrl) return null;
    try {
      const configured = new URL(configuredSiteUrl);
      return ["http:", "https:"].includes(configured.protocol) ? configured.origin : null;
    } catch {
      return null;
    }
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
