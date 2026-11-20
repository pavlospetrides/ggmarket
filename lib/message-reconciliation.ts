export const FALLBACK_RECONCILIATION_MS = 60_000;

const messageCursorPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseMessageCursor(value: string | null):
  | { ok: true; value: string | null }
  | { ok: false } {
  if (value === null) return { ok: true, value: null };
  if (!messageCursorPattern.test(value) || !Number.isFinite(Date.parse(value))) {
    return { ok: false };
  }
  return { ok: true, value };
}

export function shouldUseFallbackReconciliation(status: string) {
  return status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED";
}
