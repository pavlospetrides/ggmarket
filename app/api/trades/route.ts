import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tradeSchema } from "@/lib/validation";
import { readJson } from "@/lib/security";

export async function POST(request: Request) {
  if (!await getUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = tradeSchema.safeParse(await readJson(request)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid trade." }, { status: 400 });
  const supabase = await createClient(); const { data, error } = await supabase!.rpc("create_trade_proposal", { target_conversation: parsed.data.conversationId, offered_listing: parsed.data.offeredListingId, cash: parsed.data.cashAdjustment, proposal_note: parsed.data.note ?? null });
  if (error) return NextResponse.json({ error: "Trade proposal could not be created." }, { status: 400 }); return NextResponse.json(data, { status: 201 });
}
