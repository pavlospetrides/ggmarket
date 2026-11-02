import { getApplicationOrigin } from "./site-url";

export function buildAuthCallbackUrl(currentOrigin: string, next: string, welcome = false) {
  const origin = getApplicationOrigin(currentOrigin, process.env, true);
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);
  if (welcome) callback.searchParams.set("welcome", "1");
  return callback.toString();
}
