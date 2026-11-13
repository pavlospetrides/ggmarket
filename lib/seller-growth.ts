import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import type { SellerVerificationApplication } from "./seller-growth-domain";
export type { SellerVerificationApplication, SellerVerificationStatus } from "./seller-growth-domain";
export { verificationStatusContent } from "./seller-growth-domain";

export async function getLatestSellerVerification(
  _sellerId: string,
  client?: SupabaseClient,
): Promise<SellerVerificationApplication | null> {
  const supabase = client ?? await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_my_seller_verification");
  if (error) throw new Error("Seller verification could not be loaded.");
  return (Array.isArray(data) ? data[0] : data) as SellerVerificationApplication | null;
}

export type AdminVerificationRow = SellerVerificationApplication & {
  reviewer_note: string | null;
  seller: { username: string; display_name: string } | null;
  reviewer: { username: string; display_name: string } | null;
  audit: Array<{
    id: string;
    action: string;
    previous_status: string | null;
    next_status: string;
    reason: string | null;
    reviewer_note: string | null;
    created_at: string;
    actor: { username: string; display_name: string } | null;
  }>;
};

export async function getAdminVerificationApplications(
  client: SupabaseClient,
  status?: string,
  search?: string,
): Promise<AdminVerificationRow[]> {
  let query = client
    .from("seller_verifications")
    .select("id,seller_id,status,application_note,reviewer_note,decision_reason,reviewed_at,resubmission_eligible_at,created_at,updated_at,seller:profiles!seller_verifications_seller_id_fkey(username,display_name),reviewer:profiles!seller_verifications_reviewed_by_fkey(username,display_name),audit:seller_verification_audit(id,action,previous_status,next_status,reason,reviewer_note,created_at,actor:profiles!seller_verification_audit_actor_id_fkey(username,display_name))")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status && ["pending", "verified", "more_info", "rejected", "revoked"].includes(status)) query = query.eq("status", status);
  if (search?.trim()) {
    const term = search.trim().slice(0, 80).replace(/[%_,().]/g, "");
    if (term) query = query.or(`application_note.ilike.%${term}%,decision_reason.ilike.%${term}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error("Seller verification queue could not be loaded.");
  return (data ?? []) as unknown as AdminVerificationRow[];
}

export type PromotionEntitlement = {
  id: string;
  source: "founder" | "referral" | "admin";
  duration_days: number;
  state: "available" | "active" | "expired" | "suspended" | "revoked" | "consumed";
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export async function getFounderProgramStats(client?: SupabaseClient) {
  const supabase = client ?? await createClient();
  if (!supabase) return { allocated: 0, remaining: 100 };
  const { count, error } = await supabase.from("founding_sellers").select("id", { count: "exact", head: true });
  if (error) throw new Error("Founder availability could not be loaded.");
  const allocated = Math.min(100, count ?? 0);
  return { allocated, remaining: Math.max(0, 100 - allocated) };
}

export async function getSellerPromotionState(sellerId: string, client?: SupabaseClient) {
  const supabase = client ?? await createClient();
  if (!supabase) return { founder: null, entitlements: [], campaigns: [] };
  const [founderResult, entitlementResult, campaignResult] = await Promise.all([
    supabase.from("founding_sellers").select("slot_number,badge_active,assigned_at,revoked_at").eq("seller_id", sellerId).maybeSingle(),
    supabase.from("promotion_entitlements").select("id,source,duration_days,state,starts_at,expires_at,created_at").eq("seller_id", sellerId).order("created_at", { ascending: false }),
    supabase.from("featured_listing_campaigns").select("id,entitlement_id,listing_id,state,starts_at,expires_at").eq("seller_id", sellerId).order("created_at", { ascending: false }),
  ]);
  if (founderResult.error || entitlementResult.error || campaignResult.error) throw new Error("Promotion benefits could not be loaded.");
  return {
    founder: founderResult.data,
    entitlements: (entitlementResult.data ?? []) as PromotionEntitlement[],
    campaigns: campaignResult.data ?? [],
  };
}

export type ReferralReward = {
  id: string;
  entitlement_id: string;
  status: "earned" | "redeemed" | "expired" | "revoked";
  earned_at: string;
  redeemed_at: string | null;
};

export async function getReferralDashboard(client?: SupabaseClient) {
  const supabase = client ?? await createClient();
  if (!supabase) return { code: null, referrals: [], rewards: [] };
  const { data: code, error: codeError } = await supabase.rpc("ensure_referral_code");
  if (codeError) throw new Error("Referral code could not be loaded.");
  const codeRow = Array.isArray(code) ? code[0] : code;
  const [referralsResult, rewardsResult] = await Promise.all([
    supabase.from("referrals").select("id,status,risk_status,attributed_at,qualified_at").order("attributed_at", { ascending: false }).limit(100),
    supabase.from("promotion_reward_ledger").select("id,entitlement_id,status,earned_at,redeemed_at").order("earned_at", { ascending: false }).limit(100),
  ]);
  if (referralsResult.error || rewardsResult.error) throw new Error("Referral activity could not be loaded.");
  return {
    code: typeof codeRow?.code === "string" ? codeRow.code : null,
    referrals: referralsResult.data ?? [],
    rewards: (rewardsResult.data ?? []) as ReferralReward[],
  };
}

