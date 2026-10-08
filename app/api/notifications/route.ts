import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getUser(); if (!user) return NextResponse.json({ items: [], unread: 0 }); const supabase = await createClient();
  const { data, error } = await supabase!.from("notifications").select("id,type,title,body,href,read_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(12);
  if (error) return NextResponse.json({ items: [], unread: 0 }); return NextResponse.json({ items: data ?? [], unread: (data ?? []).filter((item) => !item.read_at).length });
}

export async function PATCH(request: Request) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as { id?: unknown; all?: unknown }; const supabase = await createClient();
  let query = supabase!.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (body.all !== true) { if (typeof body.id !== "string") return NextResponse.json({ error: "Invalid notification." }, { status: 400 }); query = query.eq("id", body.id); }
  const { error } = await query; if (error) return NextResponse.json({ error: "Notification could not be updated." }, { status: 400 }); return NextResponse.json({ ok: true });
}
