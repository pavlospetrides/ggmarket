import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listingUpdateSchema } from "@/lib/validation";
import { readJson } from "@/lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params;
  const body = await readJson(request); const supabase = await createClient();
  if (typeof body === "object" && body !== null && (body as { action?: unknown }).action === "publish") { const { count } = await supabase!.from("listing_images").select("id", { count: "exact", head: true }).eq("listing_id", id); if (!count) return NextResponse.json({ error: "Add at least one photo before publishing." }, { status: 400 }); const { data, error } = await supabase!.from("listings").update({ status: "active" }).eq("id", id).eq("seller_id", user.id).eq("status", "draft").select("id,status").single(); if (error) { console.error("Listing publish failed", { code: error.code }); return NextResponse.json({ error: "The listing could not be published." }, { status: 400 }); } return NextResponse.json(data); }
  const parsed = listingUpdateSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid listing." }, { status: 400 });
  const { data, error } = await supabase!.from("listings").update({ title: parsed.data.title, description: parsed.data.description, price: parsed.data.price, condition: parsed.data.condition, location: parsed.data.location, shipping_available: parsed.data.shipping, meetup_available: parsed.data.meetup, status: parsed.data.status }).eq("id", id).eq("seller_id", user.id).select("id,status").single();
  if (error) { console.error("Listing update failed", { code: error.code }); return NextResponse.json({ error: "The listing could not be updated." }, { status: 400 }); } return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; const supabase = await createClient();
  const { data: listing } = await supabase!.from("listings").select("id,status,listing_images(storage_path)").eq("id", id).eq("seller_id", user.id).maybeSingle(); if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const paths = (listing.listing_images ?? []).map((image: { storage_path: string }) => image.storage_path); if (paths.length) { const { error } = await supabase!.storage.from("listing-images").remove(paths); if (error) return NextResponse.json({ error: "Listing images could not be removed." }, { status: 400 }); }
  const { error } = await supabase!.from("listings").delete().eq("id", id).eq("seller_id", user.id); if (error) return NextResponse.json({ error: "Listing could not be deleted." }, { status: 400 }); return NextResponse.json({ ok: true });
}
