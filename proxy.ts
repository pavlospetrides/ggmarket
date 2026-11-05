import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildContentSecurityPolicy,
  getPublicRequestOrigin,
  isTrustedMutationRequest,
} from "@/lib/request-security";
import { getCanonicalRedirectUrl } from "./lib/site-url";
import {
  getSupabaseCookieOptions,
  hasSupabaseAuthStorageCookie,
  withPrivateNoStore,
} from "./lib/supabase/cookie-security";

function secure(response: NextResponse, request: NextRequest) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Referrer-Policy",
    request.nextUrl.pathname === "/auth/recovery/continue" ||
      request.nextUrl.pathname === "/auth/confirm-signup/continue"
      ? "same-origin"
      : request.nextUrl.pathname.startsWith("/auth/recovery") ||
          request.nextUrl.pathname.startsWith("/auth/confirm-signup")
        ? "no-referrer"
        : "strict-origin-when-cross-origin",
  );
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

function rejectedVerificationResponse(request: NextRequest) {
  const target = request.nextUrl.pathname === "/auth/confirm-signup/verify"
    ? "/verify-email?status=invalid"
    : request.nextUrl.pathname === "/auth/recovery/confirm"
      ? "/reset-password?status=invalid"
      : null;
  if (!target) return null;

  const origin = getPublicRequestOrigin(request.headers, request.nextUrl.protocol)
    ?? request.nextUrl.origin;
  return withPrivateNoStore(NextResponse.redirect(new URL(target, origin), 303));
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
      const verificationResponse = rejectedVerificationResponse(request);
      if (verificationResponse) return secure(verificationResponse, request);
      return secure(
        NextResponse.json({ error: "Cross-site request denied." }, { status: 403 }),
        request,
      );
    }
  }
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !hasSupabaseAuthStorageCookie(request.cookies.getAll())) {
    return secure(response, request);
  }
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
  await supabase.auth.getClaims();
  return secure(response, request);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
