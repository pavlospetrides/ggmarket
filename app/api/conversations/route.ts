import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { conversationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Please log in to message sellers." }, { status: 401 });
  const parsed = conversationSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  const supabase = await createClient(); const { data, error } = await supabase!.rpc("start_conversation", { target_listing_id: parsed.data.listingId });
  if (error) return NextResponse.json({ error: "This conversation could not be started." }, { status: 400 });
  return NextResponse.json({ id: data });
}
