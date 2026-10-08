import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export async function getUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function requireUser(next = "/profile") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function getAdminUser() {
  const user = await getUser();
  if (!user) return null;
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((x) => x.trim().toLowerCase());
  if (!user.email || !allowed.includes(user.email.toLowerCase())) return null;
  const supabase = await createClient(); const { data, error } = await supabase!.rpc("is_admin");
  if (error || data !== true) return null;
  return user;
}

export async function requireAdmin() { const user = await getAdminUser(); if (!user) redirect("/"); return user; }
