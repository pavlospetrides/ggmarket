import { describe, expect, it } from "vitest";
import { createClientUuid } from "../lib/client-id";

describe("createClientUuid", () => {
  it("uses randomUUID when the secure-context API exists", () => {
    const value = "11111111-1111-4111-8111-111111111111";
    expect(createClientUuid({ randomUUID: () => value, getRandomValues: () => new Uint8Array(16) })).toBe(value);
  });

  it("creates an RFC 4122 version 4 UUID when randomUUID is unavailable", () => {
    const bytes = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const value = createClientUuid({ getRandomValues: (target) => { target.set(bytes); return target; } });

    expect(value).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });
});
