import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { readJson } from "@/lib/security";

type ActionBody = { reportId?: unknown; listingId?: unknown; action?: unknown };
export async function PATCH(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await readJson(request) as ActionBody | null;
  if (!body) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  if (typeof body.reportId !== "string" || typeof body.listingId !== "string" || !["dismiss", "remove"].includes(String(body.action))) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase!.rpc("moderate_report", {
    target_report: body.reportId,
    target_listing: body.listingId,
    decision: body.action,
  });
  if (error) {
    console.error("Report moderation failed", { code: error.code });
    return NextResponse.json({ error: "The report could not be resolved." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
