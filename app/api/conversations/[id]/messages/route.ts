import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { messageSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params; const parsed = messageSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid message." }, { status: 400 });
  const supabase = await createClient(); const { data, error } = await supabase!.from("messages").insert({ conversation_id: id, sender_id: user.id, body: parsed.data.body, client_id: parsed.data.clientId }).select("id,sender_id,body,created_at").single();
  if (error?.code === "23505") { const { data: duplicate } = await supabase!.from("messages").select("id,sender_id,body,created_at").eq("sender_id", user.id).eq("client_id", parsed.data.clientId).maybeSingle(); if (duplicate) return NextResponse.json(duplicate); }
  if (error) return NextResponse.json({ error: error.code === "P0001" ? "You are sending messages too quickly." : "Message could not be sent." }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params; const supabase = await createClient(); const { error } = await supabase!.from("conversation_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Read status could not be updated." }, { status: 400 }); return NextResponse.json({ ok: true });
}
