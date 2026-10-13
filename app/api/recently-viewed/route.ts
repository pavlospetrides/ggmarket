import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { favoriteSchema } from "@/lib/validation";
import { readJson } from "@/lib/security";

export async function POST(request: Request) {
  const user = await getUser(); if (!user) return NextResponse.json({ ok: true }); const parsed = favoriteSchema.safeParse(await readJson(request)); if (!parsed.success) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  const supabase = await createClient(); const { data: current } = await supabase!.from("recently_viewed").select("view_count,viewed_at").eq("user_id", user.id).eq("listing_id", parsed.data.listingId).maybeSingle();
  if (current && Date.now() - new Date(current.viewed_at).getTime() < 15 * 60_000) return NextResponse.json({ ok: true });
  const { error } = await supabase!.from("recently_viewed").upsert({ user_id: user.id, listing_id: parsed.data.listingId, viewed_at: new Date().toISOString(), view_count: (current?.view_count ?? 0) + 1 });
  if (error) return NextResponse.json({ error: "View could not be recorded." }, { status: 400 }); return NextResponse.json({ ok: true });
}
