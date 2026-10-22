import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { readJson } from "@/lib/security";

const privateHeaders = { "cache-control": "private, no-store" };

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ items: [], unread: 0, unreadMessages: 0 }, { headers: privateHeaders });
  const supabase = await createClient();
  const [itemsResult, unreadResult, unreadMessagesResult] = await Promise.all([
    supabase!.from("notifications").select("id,type,title,body,href,read_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(80),
    supabase!.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    supabase!.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "message").is("read_at", null),
  ]);
  if (itemsResult.error || unreadResult.error || unreadMessagesResult.error) {
    return NextResponse.json({ items: [], unread: 0, unreadMessages: 0 }, { headers: privateHeaders });
  }
  return NextResponse.json({
    items: itemsResult.data ?? [],
    unread: unreadResult.count ?? 0,
    unreadMessages: unreadMessagesResult.count ?? 0,
  }, { headers: privateHeaders });
}

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid notification request." }, { status: 400 });
  }
  const input = body as { id?: unknown; ids?: unknown; all?: unknown };
  const rawIds = Array.isArray(input.ids) ? input.ids : null;
  const ids = rawIds
    ? [...new Set(rawIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
    : null;
  if (ids && (ids.length === 0 || ids.length > 80 || ids.length !== rawIds!.length)) {
    return NextResponse.json({ error: "Invalid notifications." }, { status: 400 });
  }

  const supabase = await createClient();
  let query = supabase!.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (input.all !== true) {
    if (ids) query = query.in("id", ids);
    else if (typeof input.id === "string" && input.id) query = query.eq("id", input.id);
    else return NextResponse.json({ error: "Invalid notification." }, { status: 400 });
  }
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Notification could not be updated." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
