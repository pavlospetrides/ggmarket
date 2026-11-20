import { describe, expect, it } from "vitest";
import {
  FALLBACK_RECONCILIATION_MS,
  parseMessageCursor,
  shouldUseFallbackReconciliation,
} from "@/lib/message-reconciliation";

describe("message reconciliation policy", () => {
  it("accepts canonical timestamps and rejects malformed cursors", () => {
    expect(parseMessageCursor(null)).toEqual({ ok: true, value: null });
    expect(parseMessageCursor("2026-11-20T08:30:00.000Z")).toEqual({
      ok: true,
      value: "2026-11-20T08:30:00.000Z",
    });
    expect(parseMessageCursor("not-a-date")).toEqual({ ok: false });
    expect(parseMessageCursor("2026-11-20T08:30:00Z OR sender_id.neq.x")).toEqual({ ok: false });
  });

  it("disables polling for healthy Realtime and uses a one-minute failure fallback", () => {
    expect(shouldUseFallbackReconciliation("SUBSCRIBED")).toBe(false);
    expect(shouldUseFallbackReconciliation("CHANNEL_ERROR")).toBe(true);
    expect(shouldUseFallbackReconciliation("TIMED_OUT")).toBe(true);
    expect(shouldUseFallbackReconciliation("CLOSED")).toBe(true);
    expect(FALLBACK_RECONCILIATION_MS).toBe(60_000);
  });
});
