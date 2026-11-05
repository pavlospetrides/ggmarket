export const PENDING_RECOVERY_COOKIE = "ggmarket-recovery-pending";

export function isValidRecoveryTokenHash(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{32,512}$/.test(value));
}

export function readPendingRecoveryToken(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const prefix = `${PENDING_RECOVERY_COOKIE}=`;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!cookie) return null;
  const value = cookie.slice(prefix.length);
  return isValidRecoveryTokenHash(value) ? value : null;
}

export function pendingRecoveryCookieOptions(environment = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: environment === "production",
    path: "/auth/recovery",
    maxAge: 10 * 60,
    priority: "high" as const,
  };
}
