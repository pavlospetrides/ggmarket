import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/request-security";
import { readUrlEncodedForm } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { passwordResetRequestSchema } from "@/lib/validation";
import { withPrivateNoStore } from "../../../lib/supabase/cookie-security";

function resultRedirect(origin: string, status: "sent" | "failed") {
  return withPrivateNoStore(NextResponse.redirect(new URL(`/forgot-password?status=${status}`, origin), 303));
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getPublicRequestOrigin(request.headers, requestUrl.protocol) ?? requestUrl.origin;
  const formData = await readUrlEncodedForm(request);
  const parsed = passwordResetRequestSchema.safeParse({ email: formData?.get("email") });
  if (!parsed.success) return resultRedirect(origin, "failed");

  const supabase = await createClient();
  if (!supabase) return resultRedirect(origin, "failed");
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
    return resultRedirect(origin, error ? "failed" : "sent");
  } catch {
    return resultRedirect(origin, "failed");
  }
}
