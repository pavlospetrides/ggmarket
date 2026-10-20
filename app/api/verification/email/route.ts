import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/request-security";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Verification is temporarily unavailable." }, { status: 503 });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.email_confirmed_at) {
    return NextResponse.json({ status: "already_verified" });
  }
  if (!user.email) {
    return NextResponse.json({ error: "This account has no email address to verify." }, { status: 400 });
  }

  const requestUrl = new URL(request.url);
  const origin = getPublicRequestOrigin(request.headers, requestUrl.protocol) ?? requestUrl.origin;
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", "/settings/verification");

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: callback.toString() },
  });
  if (error) {
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Please wait before requesting another verification email." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "The verification email could not be sent. Please try again." },
      { status: 400 },
    );
  }

  return NextResponse.json({ status: "sent" });
}
