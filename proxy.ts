import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy, isTrustedMutationRequest } from "@/lib/request-security";
import { getCanonicalRedirectUrl } from "./lib/site-url";
import {
  getSupabaseCookieOptions,
  hasSupabaseAuthStorageCookie,
  withPrivateNoStore,
} from "./lib/supabase/cookie-security";

function secure(response: NextResponse, request: NextRequest) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(process.env.NODE_ENV === "development"),
  );
  if (process.env.NODE_ENV === "production" && request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  if (
    hasSupabaseAuthStorageCookie(request.cookies.getAll()) ||
    hasSupabaseAuthStorageCookie(response.cookies.getAll())
  ) {
    withPrivateNoStore(response);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const canonicalRedirect = getCanonicalRedirectUrl(request.nextUrl);
  if (canonicalRedirect) {
    return secure(NextResponse.redirect(canonicalRedirect, 308), request);
  }

  if (
    (request.nextUrl.pathname.startsWith("/api/") ||
      request.nextUrl.pathname.startsWith("/auth/")) &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method)
  ) {
    if (!isTrustedMutationRequest(request.headers, request.nextUrl.protocol)) {
      return secure(
        NextResponse.json({ error: "Cross-site request denied." }, { status: 403 }),
        request,
      );
    }
  }
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return secure(response, request);
  const supabase = createServerClient(url, key, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return secure(response, request);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
