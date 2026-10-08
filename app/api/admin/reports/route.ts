import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ActionBody = { reportId?: unknown; listingId?: unknown; action?: unknown };
export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json() as ActionBody;
  if (typeof body.reportId !== "string" || typeof body.listingId !== "string" || !["dismiss", "remove"].includes(String(body.action))) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const supabase = await createClient();
  if (body.action === "dismiss") { const { error } = await supabase!.from("reports").update({ status: "dismissed", moderated_by: admin.id, moderated_at: new Date().toISOString() }).eq("id", body.reportId); if (error) { console.error("Report dismissal failed", { code: error.code }); return NextResponse.json({ error: "The report could not be dismissed." }, { status: 400 }); } return NextResponse.json({ ok: true }); }
  const { error: listingError } = await supabase!.from("listings").update({ status: "removed" }).eq("id", body.listingId);
  if (listingError) { console.error("Moderation listing removal failed", { code: listingError.code }); return NextResponse.json({ error: "The listing could not be removed." }, { status: 400 }); }
  const { error } = await supabase!.from("reports").update({ status: "actioned", moderated_by: admin.id, moderated_at: new Date().toISOString() }).eq("id", body.reportId);
  if (error) { console.error("Report resolution failed", { code: error.code }); return NextResponse.json({ error: "The report could not be resolved." }, { status: 400 }); } return NextResponse.json({ ok: true });
}
