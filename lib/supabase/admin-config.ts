type SupabaseAdminEnvironment = Record<string, string | undefined>;

function firstConfigured(...values: (string | undefined)[]) {
  return values.map((value) => value?.trim()).find(Boolean);
}

export function resolveSupabaseAdminConfig(
  environment: SupabaseAdminEnvironment,
) {
  const url = firstConfigured(
    environment.SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_URL,
  );
  const key = firstConfigured(
    environment.SUPABASE_SECRET_KEY,
    environment.SUPABASE_SERVICE_ROLE_KEY,
  );

  return url && key ? { url, key } : null;
}
