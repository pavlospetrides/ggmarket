import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { readJson } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions = new Set(["approve", "reject", "more_info", "revoke"]);

export async function PATCH(request: Request) {
  if (!isFeatureEnabled("SELLER_VERIFICATION_ENABLED")) return NextResponse.json({ error: "Seller verification is disabled." }, { status: 403 });
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const input = body as { applicationId?: unknown; action?: unknown; reason?: unknown; reviewerNote?: unknown };
  const applicationId = typeof input.applicationId === "string" ? input.applicationId : "";
  const action = typeof input.action === "string" ? input.action : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  const reviewerNote = typeof input.reviewerNote === "string" ? input.reviewerNote.trim() : "";
  if (!uuid.test(applicationId) || !actions.has(action) || ((action === "reject" || action === "more_info" || action === "revoke") && reason.length < 5) || reason.length > 1000 || reviewerNote.length > 2000) {
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase!.rpc("review_seller_verification", {
    target_application: applicationId,
    review_action: action,
    reason_text: reason || null,
    private_note: reviewerNote || null,
  });
  if (error) return NextResponse.json({ error: "The decision could not be recorded." }, { status: 400 });
  if (action === "approve" && isFeatureEnabled("FOUNDING_SELLERS_ENABLED")) await supabase!.rpc("allocate_founding_sellers");
  return NextResponse.json({ application: data });
}

