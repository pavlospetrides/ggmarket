import type { SupabaseClient } from "@supabase/supabase-js";

export async function readSellerReviewSummary(supabase: SupabaseClient, sellerId: string) {
  const { data, error } = await supabase.rpc("seller_review_summary", { target_seller: sellerId }).single();
  if (error || !data || typeof data !== "object") throw new Error("Seller review summary unavailable.");
  const row = data as { average?: unknown; review_count?: unknown };
  const average = Number(row.average);
  const count = Number(row.review_count);
  if (!Number.isFinite(average) || !Number.isSafeInteger(count) || count < 0 || (count === 0 ? average !== 0 : average < 1 || average > 5)) {
    throw new Error("Seller review summary invalid.");
  }
  return { average, count };
}
