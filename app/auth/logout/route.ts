import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/request-security";
import { createClient } from "@/lib/supabase/server";
import { withPrivateNoStore } from "../../../lib/supabase/cookie-security";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const publicOrigin = getPublicRequestOrigin(request.headers, requestUrl.protocol) ?? requestUrl.origin;
  const supabase = await createClient();
  const result = supabase ? await supabase.auth.signOut() : { error: new Error("Unavailable") };
  return withPrivateNoStore(NextResponse.redirect(
    new URL(result.error ? "/settings?error=logout_failed" : "/", publicOrigin),
    303,
  ));
}
