import { describe, expect, it } from "vitest";
import { signedMediaExpiresAt, shouldRefreshFailedMedia } from "../lib/listing-media-expiry";

describe("expired signed media recovery", () => {
  it("reads the R2 signature lifetime without sending a request", () => {
    expect(signedMediaExpiresAt("https://bucket.r2.cloudflarestorage.com/key?X-Amz-Date=20261112T120000Z&X-Amz-Expires=3600")).toBe(Date.parse("2026-11-12T13:00:00Z"));
    expect(signedMediaExpiresAt("/image?X-Amz-Date=20261112T120000Z&X-Amz-Expires=3600")).toBe(Date.parse("2026-11-12T13:00:00Z"));
  });
  it("reads Supabase token expiry", () => {
    const token = `header.${Buffer.from(JSON.stringify({ exp: 1794488400 })).toString("base64url")}.signature`;
    expect(signedMediaExpiresAt(`https://project.supabase.co/image?token=${token}`)).toBe(1794488400000);
  });
  it("refreshes only expired URLs and limits repeat refreshes", () => {
    const url = "https://bucket.r2.cloudflarestorage.com/key?X-Amz-Date=20261112T120000Z&X-Amz-Expires=3600";
    const expires = Date.parse("2026-11-12T13:00:00Z");
    expect(shouldRefreshFailedMedia(url, expires - 60_000, 0)).toBe(false);
    expect(shouldRefreshFailedMedia(url, expires + 1, 0)).toBe(true);
    expect(shouldRefreshFailedMedia(url, expires + 1, expires)).toBe(false);
    expect(shouldRefreshFailedMedia("https://example.invalid/not-signed", expires, 0)).toBe(false);
    expect(signedMediaExpiresAt("invalid")).toBeNull();
  });
});
