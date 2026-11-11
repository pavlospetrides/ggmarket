import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { readJson } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { ggCardSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });

  const parsed = ggCardSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid Lootriva Card." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Your Lootriva Card could not be saved." }, { status: 503 });
  const { data, error } = await supabase
    .from("gg_cards")
    .upsert({
      user_id: user.id,
      slogan: parsed.data.slogan,
      theme_id: parsed.data.themeId,
      is_public: parsed.data.isPublic,
    })
    .select("slogan,theme_id,is_public")
    .single();

  if (error || !data) {
    console.error("Lootriva Card update failed", { code: error?.code });
    return NextResponse.json(
      { error: "Your Lootriva Card could not be saved." },
      { status: error?.code === "42501" ? 403 : 400 },
    );
  }

  return NextResponse.json({
    card: { slogan: data.slogan, themeId: data.theme_id, isPublic: data.is_public },
  });
}
