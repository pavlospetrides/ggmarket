import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createR2Storage } from "../lib/media-storage/r2";
import { resolveR2Config } from "../lib/media-storage/config";

const config = resolveR2Config({ R2_ACCOUNT_ID: "a".repeat(32), R2_BUCKET_NAME: "lootriva-images", R2_ACCESS_KEY_ID: "fake-key", R2_SECRET_ACCESS_KEY: "fake-secret" });
const path = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc/card.webp";

describe("R2 storage (mock transport, real commands)", () => {
  it("uploads exact keys with content length and private bounded cache headers", async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = createR2Storage(config, { send });
    expect(await storage.upload(path, new Uint8Array([1, 2]), { contentType: "image/webp", cacheControl: "300", upsert: true })).toEqual({ error: null });
    expect(send.mock.calls[0][0].input).toMatchObject({ Bucket: "lootriva-images", Key: path, ContentLength: 2, ContentType: "image/webp", CacheControl: "private, max-age=300" });
  });
  it("signs only GET commands for an exact key and rejects excessive lifetimes", async () => {
    const sign = vi.fn().mockResolvedValue("https://signed.example/image");
    const storage = createR2Storage(config, { send: vi.fn() }, sign);
    expect(await storage.createSignedUrls([path], 3600)).toEqual({ data: [{ path, signedUrl: "https://signed.example/image" }], error: null });
    expect(sign.mock.calls[0][1].constructor.name).toBe("GetObjectCommand");
    expect(sign.mock.calls[0][1].input).toEqual({ Bucket: "lootriva-images", Key: path });
    expect(sign.mock.calls[0][2]).toEqual({ expiresIn: 3600 });
    await expect(storage.createSignedUrls([path], 3601)).rejects.toThrow();
  });
  it.each(["../foreign/card.webp", "https://remote/image", "owner//image", "a/%2e%2e/b", "a/../b", "a\\b"])("rejects unsafe keys before transport: %s", async (key) => {
    const send = vi.fn();
    const storage = createR2Storage(config, { send });
    await expect(storage.remove([key])).rejects.toThrow("Invalid media object key.");
    expect(send).not.toHaveBeenCalled();
  });
  it("reports partial deletion errors without exposing transport errors", async () => {
    const send = vi.fn().mockResolvedValue({ Errors: [{ Key: path, Message: "secret" }] });
    expect(await createR2Storage(config, { send }).remove([path])).toEqual({ error: "media-remove-failed" });
    expect(send.mock.calls[0][0].input.Delete).toEqual({ Objects: [{ Key: path }], Quiet: true });
  });
  it("sanitizes upload exceptions", async () => {
    const storage = createR2Storage(config, { send: vi.fn().mockRejectedValue(new Error("fake-secret")) });
    expect(await storage.upload(path, new Uint8Array([1]), { contentType: "image/webp", cacheControl: "300", upsert: true })).toEqual({ error: "media-upload-failed" });
  });
  it("downloads bytes and exposes only size and SHA256 metadata", async () => {
    const send = vi.fn().mockResolvedValueOnce({ Body: { transformToByteArray: async () => new Uint8Array([1, 2]) } }).mockResolvedValueOnce({ ContentLength: 2, Metadata: { sha256: "abc" } });
    const storage = createR2Storage(config, { send });
    expect(await storage.download(path)).toEqual({ data: new Uint8Array([1, 2]), error: null });
    expect(await storage.head(path)).toEqual({ data: { byteSize: 2, sha256: "abc" }, error: null });
  });
});
