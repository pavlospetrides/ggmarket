import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeRedirectPath } from "@/lib/security";
import { getPublicRequestOrigin } from "@/lib/request-security";
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

type VerificationStatus = "verified" | "already_verified" | "expired_or_used" | "invalid";

function verificationRedirect(origin: string, status: VerificationStatus, welcome = false) {
  const requiresAuthentication = status === "verified" || status === "already_verified";
  const target = new URL(requiresAuthentication ? "/settings/verification" : "/verify-email", origin);
  target.searchParams.set("status", status);
  if (status === "verified" && welcome) target.searchParams.set("welcome", "1");
  return withPrivateNoStore(NextResponse.redirect(target));
}

function isExpiredOrUsed(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "otp_expired");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");
  const tokenHash = url.searchParams.get("token_hash");
  const requestedType = url.searchParams.get("type");
  const next = safeRedirectPath(url.searchParams.get("next"));
  const verificationFlow = next === "/settings/verification";
  const recoveryFlow = next === "/reset-password" || requestedType === "recovery";
  const welcome = url.searchParams.get("welcome") === "1";
  const publicOrigin = getPublicRequestOrigin(request.headers, url.protocol) ?? url.origin;
  if (providerError) {
    if (recoveryFlow) {
      const target = new URL("/reset-password", publicOrigin);
      target.searchParams.set("status", url.searchParams.get("error_code") === "otp_expired" ? "expired_or_used" : "invalid");
      return withPrivateNoStore(NextResponse.redirect(target));
    }
    const errorCode = providerError === "access_denied" ? "oauth_cancelled" : "oauth_failed";
    const target = new URL("/login", publicOrigin);
    target.searchParams.set("error", errorCode);
    target.searchParams.set("next", next);
    return withPrivateNoStore(NextResponse.redirect(target));
  }
  const supabase = await createClient();
  if (!supabase) {
    return withPrivateNoStore(NextResponse.redirect(new URL(
      recoveryFlow ? "/reset-password?status=unavailable" : "/login?error=invalid_callback",
      publicOrigin,
    )));
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

  if (!error) {
    const { data: active, error: activeError } = await supabase.rpc("is_active_user");
    if (activeError || active !== true) {
      await supabase.auth.signOut();
      if (recoveryFlow) {
        return withPrivateNoStore(NextResponse.redirect(
          new URL("/reset-password?status=unavailable", publicOrigin),
        ));
      }
      const target = new URL("/login", publicOrigin);
      target.searchParams.set("error", active === false ? "account_suspended" : "oauth_failed");
      target.searchParams.set("next", next);
      return withPrivateNoStore(NextResponse.redirect(target));
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (verificationFlow) {
    if (!error && user?.email_confirmed_at) {
      return verificationRedirect(publicOrigin, "verified", welcome);
    }
    if (user?.email_confirmed_at) return verificationRedirect(publicOrigin, "already_verified");
    return verificationRedirect(publicOrigin, isExpiredOrUsed(error) ? "expired_or_used" : "invalid");
  }

  if (recoveryFlow && error) {
    const target = new URL("/reset-password", publicOrigin);
    target.searchParams.set("status", isExpiredOrUsed(error) ? "expired_or_used" : "invalid");
    return withPrivateNoStore(NextResponse.redirect(target));
  }

  return withPrivateNoStore(NextResponse.redirect(
    new URL(
      error ? "/login?error=invalid_callback" : next,
      publicOrigin,
    ),
  ));
}
