import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { readJson } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isFeatureEnabled("REFERRAL_REWARDS_ENABLED")) return NextResponse.json({ error: "Referral rewards are unavailable." }, { status: 403 });
  if (!await getUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJson(request) as { rewardId?: unknown; listingId?: unknown } | null;
  const rewardId = typeof body?.rewardId === "string" ? body.rewardId : "";
  const listingId = typeof body?.listingId === "string" ? body.listingId : "";
  if (!uuid.test(rewardId) || !uuid.test(listingId)) return NextResponse.json({ error: "Choose an eligible listing and reward." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase!.rpc("redeem_referral_reward", { target_reward: rewardId, target_listing: listingId });
  if (error) return NextResponse.json({ error: "The boost could not be activated." }, { status: 400 });
  return NextResponse.json({ campaign: data });
}
