import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tradeActionSchema } from "@/lib/validation";
import { readJson } from "@/lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params; const parsed = tradeActionSchema.safeParse(await readJson(request)); if (!parsed.success) return NextResponse.json({ error: "Invalid trade action." }, { status: 400 });
  const supabase = await createClient(); const { data, error } = await supabase!.rpc("respond_to_trade", { target_proposal: id, action: parsed.data.action });
  if (error) return NextResponse.json({ error: "You cannot perform that trade action." }, { status: 403 }); return NextResponse.json(data);
}
