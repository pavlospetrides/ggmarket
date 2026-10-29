export const CANONICAL_SITE_ORIGIN = "https://ggmarket.eu";
export const LOCAL_SITE_ORIGIN = "http://localhost:3000";

const LEGACY_PUBLIC_HOSTS = new Set([
  "www.ggmarket.eu",
  "ggmarket-sage.vercel.app",
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
  return new URL(`${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`, `${CANONICAL_SITE_ORIGIN}/`);
}
