import { getApplicationOrigin } from "./site-url";

export function buildAuthCallbackUrl(currentOrigin: string, next: string, welcome = false) {
  const origin = getApplicationOrigin(currentOrigin, process.env, true);
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);
  if (welcome) callback.searchParams.set("welcome", "1");
  return callback.toString();
}

export function buildPasswordRecoveryUrl(currentOrigin: string) {
  const origin = getApplicationOrigin(currentOrigin, process.env, true);
  return new URL("/auth/recovery", origin).toString();
}

export function buildSignupConfirmationUrl(currentOrigin: string) {
  const origin = getApplicationOrigin(currentOrigin, process.env, true);
  return new URL("/auth/confirm-signup", origin).toString();
}
