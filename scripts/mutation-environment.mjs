export function validateMutationEnvironment(env, { requireLocal = false } = {}) {
  if (env.E2E_ALLOW_MUTATION !== "1") {
    throw new Error("State-changing security testing is disabled. Set E2E_ALLOW_MUTATION=1 only for an approved disposable target.");
  }

  const expectedRef = env.E2E_EXPECTED_PROJECT_REF?.trim();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expectedRef || !url || !anonKey || !serviceKey) {
    throw new Error("State-changing security testing requires a complete disposable-project configuration.");
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    throw new Error("State-changing security testing requires a valid disposable-project URL.");
  }

  const localHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
  if (requireLocal) {
    if (!localHosts.has(target.hostname)) {
      throw new Error("State-changing security testing requires a local Supabase URL.");
    }
    if (expectedRef !== "local") {
      throw new Error("Local security testing requires E2E_EXPECTED_PROJECT_REF=local.");
    }
  } else {
    const configuredRef = target.hostname.split(".")[0] ?? "";
    if (!configuredRef || configuredRef !== expectedRef) {
      throw new Error("State-changing security testing project-ref verification failed.");
    }
  }

  return { url, anonKey, serviceKey };
}
