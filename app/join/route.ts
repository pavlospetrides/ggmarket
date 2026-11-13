import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeReferralCode, REFERRAL_VISIT_COOKIE, referralCookieOptions } from "@/lib/referrals";
import { isFeatureEnabled } from "@/lib/feature-flags";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/register", url.origin), 303);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "private, no-store");
  if (!isFeatureEnabled("REFERRAL_REWARDS_ENABLED")) return response;
  const code = normalizeReferralCode(url.searchParams.get("ref"));
  if (!code) return response;
  const supabase = await createClient();
  const { data, error } = await supabase!.rpc("record_referral_visit", { referral_code: code });
  if (!error && typeof data === "string") response.cookies.set(REFERRAL_VISIT_COOKIE, data, referralCookieOptions());
  return response;
}
