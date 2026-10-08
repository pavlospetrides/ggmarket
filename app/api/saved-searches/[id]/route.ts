import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { savedSearchUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params;
  const parsed = savedSearchUpdateSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid search alert." }, { status: 400 });
  const v = parsed.data; const update = { ...(v.name !== undefined && { name: v.name }), ...(v.searchTerm !== undefined && { search_term: v.searchTerm || null }), ...(v.categoryId !== undefined && { category_id: v.categoryId || null }), ...(v.condition !== undefined && { condition: v.condition }), ...(v.intent !== undefined && { intent: v.intent }), ...(v.minPrice !== undefined && { min_price: v.minPrice }), ...(v.maxPrice !== undefined && { max_price: v.maxPrice }), ...(v.location !== undefined && { location: v.location || null }), ...(v.enabled !== undefined && { enabled: v.enabled }) };
  const supabase = await createClient(); const { error } = await supabase!.from("saved_searches").update(update).eq("id", id).eq("user_id", user.id); if (error) return NextResponse.json({ error: "Search alert could not be updated." }, { status: 400 }); return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; const supabase = await createClient(); const { error } = await supabase!.from("saved_searches").delete().eq("id", id).eq("user_id", user.id); if (error) return NextResponse.json({ error: "Search alert could not be deleted." }, { status: 400 }); return NextResponse.json({ ok: true });
}
