import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/request-security";
import { readUrlEncodedForm } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { registerSchema } from "@/lib/validation";
import { withPrivateNoStore } from "../../../lib/supabase/cookie-security";
import { buildSignupConfirmationUrl } from "@/lib/auth-redirect";
import { claimPendingReferral, clearReferralVisit } from "@/lib/referrals";

function registrationRedirect(origin: string, key: "error" | "status", value: string) {
  const target = new URL("/register", origin);
  target.searchParams.set(key, value);
  return withPrivateNoStore(NextResponse.redirect(target, 303));
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const publicOrigin = getPublicRequestOrigin(request.headers, requestUrl.protocol) ?? requestUrl.origin;
  const formData = await readUrlEncodedForm(request);
  const registration = registerSchema.safeParse({
    username: formData?.get("username"),
    email: formData?.get("email"),
    password: formData?.get("password"),
  });
  if (!registration.success) return registrationRedirect(publicOrigin, "error", "invalid_input");

  const supabase = await createClient();
  if (!supabase) return registrationRedirect(publicOrigin, "error", "unavailable");
  const { username, email, password } = registration.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: username },
      emailRedirectTo: buildSignupConfirmationUrl(publicOrigin),
    },
  });
  if (error) return registrationRedirect(publicOrigin, "error", "signup_failed");
  const destination = data.session && data.user?.email_confirmed_at
    ? "/settings/verification?status=verified&welcome=1"
    : data.session ? "/profile" : "/register?status=check_email";
  const response = withPrivateNoStore(NextResponse.redirect(new URL(destination, publicOrigin), 303));
  if (data.session && data.user?.email_confirmed_at && await claimPendingReferral(supabase, request.headers.get("cookie"))) clearReferralVisit(response);
  return response;
}
