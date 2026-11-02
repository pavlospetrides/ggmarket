export type MutationEnvironment = {
  url: string;
  anonKey: string;
  serviceKey: string;
};

export function validateMutationEnvironment(
  env: Record<string, string | undefined>,
  options?: { requireLocal?: boolean },
): MutationEnvironment;
