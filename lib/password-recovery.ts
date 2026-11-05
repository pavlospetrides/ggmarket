type AuthenticationMethod = string | { method?: unknown };

export function hasRecoveryAuthenticationMethod(value: unknown) {
  if (!Array.isArray(value)) return false;
  return value.some((entry: AuthenticationMethod) =>
    typeof entry === "string" ? entry === "recovery" : entry?.method === "recovery",
  );
}
type PasswordValidation =
  | { ok: true; password: string }
  | { ok: false; field: "password" | "confirmation"; message: string };

export function validateNewPassword(password: string, confirmation: string): PasswordValidation {
  if (password.length < 8) return { ok: false, field: "password", message: "Use at least 8 characters." };
  if (password.length > 1024) return { ok: false, field: "password", message: "Use no more than 1,024 characters." };
  if (password !== confirmation) return { ok: false, field: "confirmation", message: "Passwords do not match." };
  return { ok: true, password };
}
