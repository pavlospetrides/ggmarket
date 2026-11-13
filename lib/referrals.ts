import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import { isFeatureEnabled } from "./feature-flags";

export const REFERRAL_VISIT_COOKIE = "lootriva-referral-visit";
const referralCodePattern = /^[A-Z0-9]{10,16}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeReferralCode(value: string | null) {
  const code = value?.trim().toUpperCase() ?? "";
  return referralCodePattern.test(code) ? code : null;
}

export function referralCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };
}

export function readReferralVisit(cookieHeader: string | null) {
  const value = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${REFERRAL_VISIT_COOKIE}=`))?.slice(REFERRAL_VISIT_COOKIE.length + 1) ?? "";
  return uuidPattern.test(value) ? value : null;
}

export async function claimPendingReferral(client: SupabaseClient, cookieHeader: string | null) {
  if (!isFeatureEnabled("REFERRAL_REWARDS_ENABLED")) return false;
  const referralVisit = readReferralVisit(cookieHeader);
  if (!referralVisit) return false;
  const { error } = await client.rpc("claim_referral_attribution", { referral_visit: referralVisit });
  return !error;
}

export function clearReferralVisit(response: NextResponse) {
  response.cookies.set(REFERRAL_VISIT_COOKIE, "", { ...referralCookieOptions(), maxAge: 0 });
  return response;
}
