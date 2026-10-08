import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { savedSearchSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = savedSearchSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid search alert." }, { status: 400 });
  const value = parsed.data; const supabase = await createClient(); const { data, error } = await supabase!.from("saved_searches").insert({ user_id: user.id, name: value.name, search_term: value.searchTerm || null, category_id: value.categoryId || null, condition: value.condition || null, intent: value.intent || null, min_price: value.minPrice ?? null, max_price: value.maxPrice ?? null, location: value.location || null, enabled: value.enabled }).select("id,name,search_term,category_id,condition,intent,min_price,max_price,location,enabled").single();
  if (error) return NextResponse.json({ error: error.code === "P0001" ? "You can save up to 25 searches." : "Search alert could not be created." }, { status: 400 }); return NextResponse.json(data, { status: 201 });
}
