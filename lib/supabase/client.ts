import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "./cookie-security";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured. Add the public environment variables.");
  return createBrowserClient(url, key, { cookieOptions: getSupabaseCookieOptions() });
}
