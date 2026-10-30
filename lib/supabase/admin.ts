import "server-only";
import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseAdminConfig } from "./admin-config";

export function createAdminClient() {
  const config = resolveSupabaseAdminConfig(process.env);
  if (!config) return null;
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
