import { NextResponse } from "next/server";
import {
  pendingEmailConfirmationCookieOptions,
  PENDING_EMAIL_CONFIRMATION_COOKIE,
  readPendingEmailConfirmationToken,
} from "@/lib/email-confirmation-pending";
import { getPublicRequestOrigin } from "@/lib/request-security";
import { createClient } from "@/lib/supabase/server";
import { withPrivateNoStore } from "@/lib/supabase/cookie-security";

type ConfirmationFailure = "expired_or_used" | "invalid" | "unavailable";

function redirect(origin: string, path: string, clearPending = true) {
  const response = withPrivateNoStore(NextResponse.redirect(new URL(path, origin), 303));
  response.headers.set("Referrer-Policy", "no-referrer");
  if (clearPending) {
    response.cookies.set(PENDING_EMAIL_CONFIRMATION_COOKIE, "", {
      ...pendingEmailConfirmationCookieOptions(),
      maxAge: 0,
    });
  }
  return response;
}

function failureRedirect(origin: string, status: ConfirmationFailure, clearPending = true) {
  return redirect(origin, `/verify-email?status=${status}`, clearPending);
}

function isExpiredOrUsed(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "otp_expired");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = getPublicRequestOrigin(request.headers, url.protocol) ?? url.origin;
  if (request.headers.get("origin") !== new URL(origin).origin) return failureRedirect(origin, "invalid");
  const tokenHash = readPendingEmailConfirmationToken(request.headers.get("cookie"));
  if (!tokenHash) return failureRedirect(origin, "invalid");

  try {
    const supabase = await createClient();
    if (!supabase) return failureRedirect(origin, "unavailable", false);
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (error) {
      const { data: current } = await supabase.auth.getUser();
      if (current.user?.email_confirmed_at) {
        return redirect(origin, "/settings/verification?status=already_verified");
      }
      return failureRedirect(origin, isExpiredOrUsed(error) ? "expired_or_used" : "invalid");
    }
    if (!data.session || !data.user?.email_confirmed_at) return failureRedirect(origin, "invalid");

    const { data: active, error: activeError } = await supabase.rpc("is_active_user");
    if (activeError || active !== true) {
      await supabase.auth.signOut();
      return failureRedirect(origin, "unavailable");
    }
    return redirect(origin, "/settings/verification?status=verified&welcome=1");
  } catch {
    return failureRedirect(origin, "unavailable", false);
  }
}
