import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/request-security";
import {
  pendingRecoveryCookieOptions,
  PENDING_RECOVERY_COOKIE,
  readPendingRecoveryToken,
} from "@/lib/recovery-pending";
import { createClient } from "@/lib/supabase/server";
import { withPrivateNoStore } from "@/lib/supabase/cookie-security";

type RecoveryFailure = "expired_or_used" | "invalid" | "unavailable";

function recoveryRedirect(origin: string, status?: RecoveryFailure, clearPending = false) {
  const target = new URL("/reset-password", origin);
  if (status) target.searchParams.set("status", status);
  const response = withPrivateNoStore(NextResponse.redirect(target, 303));
  response.headers.set("Referrer-Policy", "no-referrer");
  if (clearPending) {
    response.cookies.set(PENDING_RECOVERY_COOKIE, "", {
      ...pendingRecoveryCookieOptions(),
      maxAge: 0,
    });
  }
  return response;
}

function isExpiredOrUsed(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "otp_expired");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = getPublicRequestOrigin(request.headers, url.protocol) ?? url.origin;
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin !== new URL(origin).origin) return recoveryRedirect(origin, "invalid", true);

  const tokenHash = readPendingRecoveryToken(request.headers.get("cookie"));
  if (!tokenHash) return recoveryRedirect(origin, "invalid", true);

  try {
    const supabase = await createClient();
    if (!supabase) return recoveryRedirect(origin, "unavailable");
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      return recoveryRedirect(origin, isExpiredOrUsed(error) ? "expired_or_used" : "invalid", true);
    }
    if (!data.session || !data.user) return recoveryRedirect(origin, "invalid", true);

    const { data: active, error: activeError } = await supabase.rpc("is_active_user");
    if (activeError || active !== true) {
      await supabase.auth.signOut();
      return recoveryRedirect(origin, "unavailable", true);
    }

    return recoveryRedirect(origin, undefined, true);
  } catch {
    return recoveryRedirect(origin, "unavailable");
  }
}
