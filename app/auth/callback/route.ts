import { NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code)
    return NextResponse.redirect(
      new URL("/login?error=invalid_callback", url.origin),
    );
  const supabase = await createClient();
  const { error } = await supabase!.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(
    new URL(
      error
        ? "/login?error=invalid_callback"
        : safeRedirectPath(url.searchParams.get("next")),
      url.origin,
    ),
  );
}
