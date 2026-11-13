import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";

export type SellerVerificationStatus =
  | "not_applied"
  | "pending"
  | "verified"
  | "more_info"
  | "rejected"
  | "revoked"
  | "expired";

export type SellerVerificationApplication = {
  id: string;
  seller_id: string;
  status: Exclude<SellerVerificationStatus, "not_applied">;
  application_note: string | null;
  reviewer_note: string | null;
  decision_reason: string | null;
  reviewed_at: string | null;
  resubmission_eligible_at: string | null;
  created_at: string;
  updated_at: string;
};

export function verificationStatusContent(status: SellerVerificationStatus) {
  switch (status) {
    case "pending":
      return { label: "Pending review", nextStep: "Lootriva staff will review your marketplace profile and activity. You will receive an in-app notification." };
    case "more_info":
      return { label: "More information needed", nextStep: "Review the request, add the requested information, and submit again." };
    case "verified":
      return { label: "Seller reviewed", nextStep: "Keep your account in good standing and your listings accurate." };
    case "rejected":
      return { label: "Not approved", nextStep: "Review the reason below. You can apply again on the displayed eligible date." };
    case "revoked":
      return { label: "Review revoked", nextStep: "Contact Lootriva support if you believe this decision needs another review." };
    case "expired":
      return { label: "Review expired", nextStep: "Submit a new application if the seller-review program is available." };
    default:
      return { label: "Not applied", nextStep: "Tell Lootriva how you source and describe the gaming items you list." };
  }
}

export async function getLatestSellerVerification(
  sellerId: string,
  client?: SupabaseClient,
): Promise<SellerVerificationApplication | null> {
  const supabase = client ?? await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("seller_verifications")
    .select("id,seller_id,status,application_note,reviewer_note,decision_reason,reviewed_at,resubmission_eligible_at,created_at,updated_at")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Seller verification could not be loaded.");
  return data as SellerVerificationApplication | null;
}

export type AdminVerificationRow = SellerVerificationApplication & {
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
  if (search?.trim()) query = query.or(`application_note.ilike.%${search.trim().slice(0, 80).replaceAll("%", "")}%,decision_reason.ilike.%${search.trim().slice(0, 80).replaceAll("%", "")}%`);
  const { data, error } = await query;
  if (error) throw new Error("Seller verification queue could not be loaded.");
  return (data ?? []) as unknown as AdminVerificationRow[];
}

