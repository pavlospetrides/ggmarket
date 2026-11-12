import { describe, expect, it } from "vitest";
import {
  MediaStorageConfigurationError,
  resolveMediaStorageProvider,
  resolveR2Config,
} from "@/lib/media-storage/config";

describe("media storage configuration", () => {
  it("keeps Supabase as the safe default without requiring R2 secrets", () => {
    expect(resolveMediaStorageProvider({})).toBe("supabase");
    expect(resolveMediaStorageProvider({ MEDIA_STORAGE_PROVIDER: " supabase " })).toBe("supabase");
  });

  it("accepts the explicit R2 rollout flag", () => {
    expect(resolveMediaStorageProvider({ MEDIA_STORAGE_PROVIDER: "r2" })).toBe("r2");
  });

  it("rejects unknown provider flags", () => {
    expect(() => resolveMediaStorageProvider({ MEDIA_STORAGE_PROVIDER: "public-r2" }))
      .toThrow(MediaStorageConfigurationError);
  });

  it("resolves a complete R2 configuration without returning credential-bearing errors", () => {
    expect(resolveR2Config({
      R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      R2_BUCKET_NAME: "lootriva-images",
      R2_ACCESS_KEY_ID: "access-key-value",
      R2_SECRET_ACCESS_KEY: "secret-key-value",
    })).toEqual({
      accountId: "0123456789abcdef0123456789abcdef",
      bucketName: "lootriva-images",
      accessKeyId: "access-key-value",
      secretAccessKey: "secret-key-value",
      endpoint: "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
    });
  });

  it.each([
    { R2_ACCOUNT_ID: "not an account", R2_BUCKET_NAME: "lootriva-images", R2_ACCESS_KEY_ID: "key", R2_SECRET_ACCESS_KEY: "secret" },
    { R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef", R2_BUCKET_NAME: "../bucket", R2_ACCESS_KEY_ID: "key", R2_SECRET_ACCESS_KEY: "secret" },
    { R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef", R2_BUCKET_NAME: "lootriva-images", R2_ACCESS_KEY_ID: "key" },
  ])("fails closed for malformed or incomplete R2 settings", (environment) => {
    let message = "";
    try {
      resolveR2Config(environment);
    } catch (error) {
      expect(error).toBeInstanceOf(MediaStorageConfigurationError);
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe("R2 media storage is unavailable.");
    expect(message).not.toContain(environment.R2_ACCESS_KEY_ID ?? "access-key-value");
    expect(message).not.toContain(environment.R2_SECRET_ACCESS_KEY ?? "secret-key-value");
  });
});
