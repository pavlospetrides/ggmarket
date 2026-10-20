type MutationEnvironment = {
  url: string;
  anonKey: string;
  serviceKey: string;
};

type MutationEnvironmentInput = Record<string, string | undefined>;

export function validateMutationEnvironment(env: MutationEnvironmentInput): MutationEnvironment {
  if (env.E2E_ALLOW_MUTATION !== "1") {
    throw new Error("State-changing E2E is disabled. Set E2E_ALLOW_MUTATION=1 only for an approved disposable project.");
  }

  const expectedRef = env.E2E_EXPECTED_PROJECT_REF?.trim();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expectedRef || !url || !anonKey || !serviceKey) {
    throw new Error("State-changing E2E requires a complete disposable-project configuration.");
  }

  let configuredRef = "";
  try {
    configuredRef = new URL(url).hostname.split(".")[0] ?? "";
  } catch {
    throw new Error("State-changing E2E requires a valid disposable-project URL.");
  }
  if (!configuredRef || configuredRef !== expectedRef) {
    throw new Error("State-changing E2E project-ref verification failed.");
  }

  return { url, anonKey, serviceKey };
}

export function requireMutationEnvironment(): MutationEnvironment {
  return validateMutationEnvironment(process.env);
}
