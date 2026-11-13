import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { readJson } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isFeatureEnabled("FEATURED_LISTINGS_ENABLED")) return NextResponse.json({ error: "Featured listings are disabled." }, { status: 403 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid promotion request." }, { status: 400 });
  const input = body as { listingId?: unknown; entitlementId?: unknown };
  const listingId = typeof input.listingId === "string" ? input.listingId : "";
  const entitlementId = typeof input.entitlementId === "string" ? input.entitlementId : "";
  if (!uuid.test(listingId) || !uuid.test(entitlementId)) return NextResponse.json({ error: "Invalid promotion request." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase!.rpc("activate_featured_listing", { target_listing: listingId, target_entitlement: entitlementId });
  if (error) return NextResponse.json({ error: "This listing cannot be featured with that entitlement." }, { status: 400 });
  return NextResponse.json({ campaign: data });
}

