export const CANONICAL_SITE_ORIGIN = "https://lootriva.com";
export const LOCAL_SITE_ORIGIN = "http://localhost:3000";

const LEGACY_PUBLIC_HOSTS = new Set([
  "www.lootriva.com",
  "ggmarket.eu",
  "www.ggmarket.eu",
  "ggmarket-sage.vercel.app",
]);

const SENSITIVE_QUERY_KEYS = new Set([
  "access_token",
  "authorization_code",
  "code",
  "confirmation_token",
  "provider_refresh_token",
  "provider_token",
  "refresh_token",
  "token",
  "token_hash",
]);

type SiteEnvironment = Readonly<Record<string, string | undefined>>;

function httpOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function vercelPreviewOrigin(value: string | undefined) {
  if (!value) return null;
  const candidate = httpOrigin(value.includes("://") ? value : `https://${value}`);
  if (!candidate) return null;
  const url = new URL(candidate);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app")) return null;
  return url.origin;
}

export function getApplicationOrigin(
  currentOrigin: string | null,
  environment: SiteEnvironment = process.env,
  allowBrowserPreviewOrigin = false,
) {
  if (environment.VERCEL_ENV === "preview") {
    return vercelPreviewOrigin(environment.VERCEL_URL) ?? CANONICAL_SITE_ORIGIN;
  }

  if (environment.NODE_ENV === "production" || environment.VERCEL_ENV === "production") {
    const browserPreview = allowBrowserPreviewOrigin ? vercelPreviewOrigin(currentOrigin ?? undefined) : null;
    if (browserPreview && !LEGACY_PUBLIC_HOSTS.has(new URL(browserPreview).hostname)) {
      return browserPreview;
    }
    const configured = httpOrigin(environment.NEXT_PUBLIC_SITE_URL);
    return configured === CANONICAL_SITE_ORIGIN ? configured : CANONICAL_SITE_ORIGIN;
  }

  return httpOrigin(currentOrigin)
    ?? httpOrigin(environment.NEXT_PUBLIC_SITE_URL)
    ?? LOCAL_SITE_ORIGIN;
}

export function buildCanonicalUrl(pathname: string) {
  return new URL(pathname, `${CANONICAL_SITE_ORIGIN}/`).toString();
}

export function getCanonicalRedirectUrl(requestUrl: URL) {
  if (!LEGACY_PUBLIC_HOSTS.has(requestUrl.hostname.toLowerCase())) return null;

  let target: URL;
  if (requestUrl.pathname.startsWith("/auth/recovery")) {
    target = new URL("/forgot-password?status=legacy_link", CANONICAL_SITE_ORIGIN);
  } else if (requestUrl.pathname.startsWith("/auth/confirm-signup")) {
    target = new URL("/verify-email?status=legacy_link", CANONICAL_SITE_ORIGIN);
  } else if (
    requestUrl.pathname.startsWith("/auth/")
    || requestUrl.hash
    || [...requestUrl.searchParams.keys()].some((key) => SENSITIVE_QUERY_KEYS.has(key.toLowerCase()))
  ) {
    target = new URL("/login?error=legacy_link", CANONICAL_SITE_ORIGIN);
  } else {
    target = new URL(`${requestUrl.pathname}${requestUrl.search}`, `${CANONICAL_SITE_ORIGIN}/`);
  }

  // Browsers do not send URL fragments to servers and otherwise inherit the
  // original fragment across redirects. An explicit empty fragment prevents a
  // legacy OAuth/access-token fragment from reaching the canonical origin.
  target.hash = "#";
  return target;
}
