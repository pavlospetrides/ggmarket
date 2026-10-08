import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { offerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!await getUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = offerSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid offer." }, { status: 400 });
  const supabase = await createClient(); const { data, error } = await supabase!.rpc("create_offer", { target_conversation: parsed.data.conversationId, offer_amount: parsed.data.amount, parent_id: parsed.data.parentOfferId ?? null });
  if (error) return NextResponse.json({ error: error.code === "P0001" ? "You are making offers too quickly." : "Offer could not be created." }, { status: 400 }); return NextResponse.json(data, { status: 201 });
}
