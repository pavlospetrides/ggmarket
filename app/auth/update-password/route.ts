import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/request-security";
import { readUrlEncodedForm } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { withPrivateNoStore } from "@/lib/supabase/cookie-security";
import { hasRecoveryAuthenticationMethod, validateNewPassword } from "@/lib/password-recovery";

type PasswordResult = {
  status: "success" | "invalid" | "validation" | "rejected" | "unavailable";
  message?: string;
  field?: "password" | "confirmation";
  reason?: "too_short" | "too_long" | "mismatch" | "same_password" | "weak_password" | "update_failed";
};

function result(request: Request, body: PasswordResult, status: number) {
  if (request.headers.get("accept")?.includes("application/json")) {
    const publicBody = {
      status: body.status,
      ...(body.message ? { message: body.message } : {}),
      ...(body.field ? { field: body.field } : {}),
    };
    return withPrivateNoStore(NextResponse.json(publicBody, { status }));
  }
  const requestUrl = new URL(request.url);
  const origin = getPublicRequestOrigin(request.headers, requestUrl.protocol) ?? requestUrl.origin;
  const target = new URL("/reset-password", origin);
  target.searchParams.set("status", body.status);
  if (body.reason) target.searchParams.set("reason", body.reason);
  return withPrivateNoStore(NextResponse.redirect(target, 303));
}
function rejectedPasswordMessage(code: unknown) {
  if (code === "same_password") return "Choose a password you have not used before.";
  if (code === "weak_password") return "Choose a stronger password and try again.";
  return "Your password could not be updated. Request a new reset link.";
}
function validationReason(field: "password" | "confirmation", message: string) {
  if (field === "confirmation") return "mismatch" as const;
  return message.includes("1,024") ? "too_long" as const : "too_short" as const;
}

export async function POST(request: Request) {
  const formData = await readUrlEncodedForm(request);
  const validation = validateNewPassword(
    String(formData?.get("password") ?? ""),
    String(formData?.get("confirmation") ?? ""),
  );
  if (!validation.ok) {
    return result(request, {
      status: "validation",
      message: validation.message,
      field: validation.field,
      reason: validationReason(validation.field, validation.message),
    }, 400);
  }

  try {
    const supabase = await createClient();
    if (!supabase) return result(request, { status: "unavailable" }, 503);

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !hasRecoveryAuthenticationMethod(claimsData?.claims.amr)) {
      return result(request, { status: "invalid" }, 403);
    }

    const { data: active, error: activeError } = await supabase.rpc("is_active_user");
    if (activeError || active !== true) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // The update remains denied even if local session cleanup fails.
      }
      return result(request, { status: "invalid" }, 403);
    }

    const { error } = await supabase.auth.updateUser({ password: validation.password });
    if (error) {
      const reason = error.code === "same_password"
        ? "same_password"
        : error.code === "weak_password"
          ? "weak_password"
          : "update_failed";
      return result(request, { status: "rejected", message: rejectedPasswordMessage(error.code), reason }, 400);
    }

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The password is already updated, so do not report the irreversible success as a failure.
    }
    return result(request, { status: "success" }, 200);
  } catch {
    return result(request, { status: "unavailable" }, 503);
  }
}
