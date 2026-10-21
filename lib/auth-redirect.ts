import { PRODUCTION_SITE_ORIGIN } from "./request-security";

export function buildAuthCallbackUrl(currentOrigin: string, next: string) {
  const origin = process.env.NODE_ENV === "production" ? PRODUCTION_SITE_ORIGIN : new URL(currentOrigin).origin;
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);
  return callback.toString();
}
