export function signedMediaExpiresAt(source: string): number | null {
  try {
    const url = new URL(source, "https://media.invalid");
    const stamp = url.searchParams.get("X-Amz-Date");
    const seconds = Number(url.searchParams.get("X-Amz-Expires"));
    if (stamp && /^\d{8}T\d{6}Z$/.test(stamp) && Number.isFinite(seconds) && seconds > 0) {
      const date = `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T${stamp.slice(9, 11)}:${stamp.slice(11, 13)}:${stamp.slice(13, 15)}Z`;
      const expires = Date.parse(date) + seconds * 1000;
      return Number.isFinite(expires) ? expires : null;
    }
    const token = url.searchParams.get("token")?.split(".")[1];
    if (token) {
      const payload = JSON.parse(atob(token.replaceAll("-", "+").replaceAll("_", "/"))) as { exp?: unknown };
      if (typeof payload.exp === "number" && Number.isFinite(payload.exp)) return payload.exp * 1000;
    }
  } catch { /* Invalid sources are ordinary image failures, never a refresh loop. */ }
  return null;
}

export function shouldRefreshFailedMedia(source: string, now: number, lastRefresh: number): boolean {
  const expiry = signedMediaExpiresAt(source);
  return expiry !== null && expiry <= now && now - lastRefresh >= 10_000;
}
