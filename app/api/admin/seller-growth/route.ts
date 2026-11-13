import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { readJson } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  const input = body as { entityType?: unknown; entityId?: unknown; action?: unknown; reason?: unknown };
  const entityType = typeof input.entityType === "string" ? input.entityType : "";
  const entityId = typeof input.entityId === "string" ? input.entityId : "";
  const action = typeof input.action === "string" ? input.action : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!["founder", "entitlement"].includes(entityType) || !uuid.test(entityId) || !["suspend", "resume", "revoke", "restore"].includes(action) || reason.length < 5 || reason.length > 1000) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase!.rpc("admin_manage_seller_growth", { target_type: entityType, target_id: entityId, admin_action: action, reason_text: reason });
  if (error) return NextResponse.json({ error: "The seller growth action could not be recorded." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data, error } = await supabase!.rpc("qualify_referrals");
  if (error) return NextResponse.json({ error: "Referral qualification could not be completed." }, { status: 400 });
  return NextResponse.json({ awarded: Number(data ?? 0) });
}

