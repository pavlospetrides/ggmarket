import { NextResponse } from "next/server";
import { readUrlEncodedForm, safeRedirectPath } from "@/lib/security";
import { getPublicRequestOrigin } from "@/lib/request-security";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";
import { withPrivateNoStore } from "../../../lib/supabase/cookie-security";

function loginError(requestUrl: URL, code: "invalid_credentials" | "invalid_input" | "unavailable" | "account_suspended", next: string) {
  const target = new URL("/login", requestUrl.origin);
  target.searchParams.set("error", code);
  target.searchParams.set("next", next);
  return withPrivateNoStore(NextResponse.redirect(target, 303));
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const publicOrigin = getPublicRequestOrigin(request.headers, requestUrl.protocol) ?? requestUrl.origin;
  const formData = await readUrlEncodedForm(request);
  const next = safeRedirectPath(String(formData?.get("next") || "/profile"));
  const credentials = loginSchema.safeParse({
    email: formData?.get("email"),
    password: formData?.get("password"),
  });
  const publicUrl = new URL(requestUrl.pathname, publicOrigin);
  if (!credentials.success) return loginError(publicUrl, "invalid_input", next);

  const supabase = await createClient();
  if (!supabase) return loginError(publicUrl, "unavailable", next);
  const { error } = await supabase.auth.signInWithPassword(credentials.data);
  if (error) return loginError(publicUrl, "invalid_credentials", next);
  const { data: active, error: activeError } = await supabase.rpc("is_active_user");
  if (activeError || active !== true) {
    await supabase.auth.signOut();
    return loginError(publicUrl, active === false ? "account_suspended" : "unavailable", next);
  }

  return withPrivateNoStore(NextResponse.redirect(new URL(next, publicOrigin), 303));
}
