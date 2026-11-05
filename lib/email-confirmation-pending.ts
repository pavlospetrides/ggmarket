export const PENDING_EMAIL_CONFIRMATION_COOKIE = "ggmarket-signup-confirmation-pending";

export function isValidEmailConfirmationTokenHash(value: string | null | undefined): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{32,512}$/.test(value));
}

export function readPendingEmailConfirmationToken(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const prefix = `${PENDING_EMAIL_CONFIRMATION_COOKIE}=`;
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!cookie) return null;
  const value = cookie.slice(prefix.length);
  return isValidEmailConfirmationTokenHash(value) ? value : null;
}

export function pendingEmailConfirmationCookieOptions(environment = process.env.NODE_ENV) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: environment === "production",
    path: "/auth/confirm-signup",
    maxAge: 10 * 60,
    priority: "high" as const,
  };
}
