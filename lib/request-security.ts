import { CANONICAL_SITE_ORIGIN, getApplicationOrigin } from "./site-url";

function firstHeaderValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || "";
}

export const PRODUCTION_SITE_ORIGIN = CANONICAL_SITE_ORIGIN;

export function buildContentSecurityPolicy(isDevelopment: boolean) {
  const localSources = isDevelopment
    ? " http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:*"
    : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://images.unsplash.com https://*.supabase.co",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${localSources}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob: https://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
  ].map((directive) => `${directive};`).join(" ");
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
  const host = firstHeaderValue(headers.get("x-forwarded-host")) || firstHeaderValue(headers.get("host"));
  const forwardedProtocol = firstHeaderValue(headers.get("x-forwarded-proto"));
  const protocol = (forwardedProtocol || fallbackProtocol.replace(":", "")).toLowerCase();
  let requestOrigin: string | null = null;

  if (host && ["http", "https"].includes(protocol)) {
    try {
      requestOrigin = new URL(`${protocol}://${host}`).origin;
    } catch {
      requestOrigin = null;
    }
  }

  if (
    process.env.NODE_ENV === "production"
    || process.env.VERCEL_ENV === "production"
    || process.env.VERCEL_ENV === "preview"
  ) {
    return getApplicationOrigin(requestOrigin, process.env);
  }
  return requestOrigin;
}
