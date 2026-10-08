import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { listingId } = await request.json() as { listingId?: unknown }; if (typeof listingId !== "string") return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  const supabase = await createClient(); const { data: listing } = await supabase!.from("listings").select("id").eq("id", listingId).eq("seller_id", user.id).maybeSingle(); if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const code = `GG-${randomInt(10000, 100000)}`; const codeHash = createHash("sha256").update(`${user.id}:${code}`).digest("hex");
  const { data, error } = await supabase!.rpc("create_item_verification_challenge", { target_listing: listingId, challenge_hash: codeHash, challenge_hint: code.slice(-2) });
  if (error) return NextResponse.json({ error: "Verification challenge could not be created." }, { status: 400 }); return NextResponse.json({ id: data, code, expiresInHours: 24 }, { status: 201 });
}
