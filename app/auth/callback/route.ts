import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeRedirectPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { withPrivateNoStore } from "../../../lib/supabase/cookie-security";

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

function verificationRedirect(origin: string, status: "verified" | "invalid_or_expired") {
  const target = new URL("/settings/verification", origin);
  target.searchParams.set("status", status);
  return withPrivateNoStore(NextResponse.redirect(target));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const requestedType = url.searchParams.get("type");
  const next = safeRedirectPath(url.searchParams.get("next"));
  const verificationFlow = next === "/settings/verification";
  const supabase = await createClient();
  if (!supabase) {
    return withPrivateNoStore(NextResponse.redirect(new URL("/login?error=invalid_callback", url.origin)));
  }

  let error: unknown = { message: "Missing confirmation token" };
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (
    tokenHash &&
    requestedType &&
    emailOtpTypes.has(requestedType as EmailOtpType)
  ) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: requestedType as EmailOtpType,
    }));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (verificationFlow) {
    if (!error && user?.email_confirmed_at) {
      return verificationRedirect(url.origin, "verified");
    }
    if (user) return verificationRedirect(url.origin, "invalid_or_expired");
  }

  return withPrivateNoStore(NextResponse.redirect(
    new URL(
      error ? "/login?error=invalid_callback" : next,
      url.origin,
    ),
  ));
}
