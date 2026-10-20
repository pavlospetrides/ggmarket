import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("development origin allowlist", () => {
  it("contains only loopback and RFC1918 IPv4 hosts", () => {
    const origins = nextConfig.allowedDevOrigins ?? [];

    expect(origins).toContain("127.0.0.1");
    expect(origins.every((origin) => {
      if (origin === "127.0.0.1") return true;
      if (/^10\./.test(origin)) return true;
      if (/^192\.168\./.test(origin)) return true;
      const match = /^172\.(\d{1,2})\./.exec(origin);
      return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
    })).toBe(true);
  });
});
