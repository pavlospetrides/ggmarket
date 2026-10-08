import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile" }, { status: 400 });
  const supabase = await createClient(); const { data, error } = await supabase!.from("profiles").update({ username: parsed.data.username, display_name: parsed.data.displayName, location: parsed.data.location || null, bio: parsed.data.bio || null }).eq("id", user.id).select("username,display_name,location,bio").single();
  if (error) { console.error("Profile update failed", { code: error.code }); return NextResponse.json({ error: error.code === "23505" ? "That username is already taken." : "Your profile could not be updated." }, { status: 400 }); }
  return NextResponse.json({ profile: data });
}
