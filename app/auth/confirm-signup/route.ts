import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/request-security";
import {
  isValidEmailConfirmationTokenHash,
  pendingEmailConfirmationCookieOptions,
  PENDING_EMAIL_CONFIRMATION_COOKIE,
} from "@/lib/email-confirmation-pending";
import { withPrivateNoStore } from "@/lib/supabase/cookie-security";

function redirect(origin: string, path: string) {
  const response = withPrivateNoStore(NextResponse.redirect(new URL(path, origin), 303));
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getPublicRequestOrigin(request.headers, url.protocol) ?? url.origin;
  const tokenHash = url.searchParams.get("token_hash");
  if (url.searchParams.get("type") !== "email" || !isValidEmailConfirmationTokenHash(tokenHash)) {
    return redirect(origin, "/verify-email?status=invalid");
  }
  const response = redirect(origin, "/auth/confirm-signup/continue");
  response.cookies.set(PENDING_EMAIL_CONFIRMATION_COOKIE, tokenHash, pendingEmailConfirmationCookieOptions());
  return response;
}
