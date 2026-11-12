import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertExpiry, assertObjectKey, type MediaStorage } from "./types";

export function createSupabaseStorage(client: SupabaseClient): MediaStorage {
  const bucket = client.storage.from("listing-images");
  return {
    async upload(path, bytes, options) {
      assertObjectKey(path);
      const { error } = await bucket.upload(path, bytes, options);
      return { error: error ? "media-upload-failed" : null };
    },
    async remove(paths) {
      paths.forEach(assertObjectKey);
      const { error } = await bucket.remove(paths);
      return { error: error ? "media-remove-failed" : null };
    },
    async createSignedUrls(paths, expiresIn) {
      paths.forEach(assertObjectKey);
      assertExpiry(expiresIn);
      const { data, error } = await bucket.createSignedUrls(paths, expiresIn);
      if (error || !data || data.some((row) => row.error || !row.signedUrl)) return { error: "media-sign-failed" };
      return { data: data.map(({ path, signedUrl }) => ({ path: path!, signedUrl: signedUrl! })), error: null };
    },
    async download(path) {
      assertObjectKey(path);
      const { data, error } = await bucket.download(path);
      if (error || !data) return { error: "media-download-failed" };
      return { data: new Uint8Array(await data.arrayBuffer()), error: null };
    },
    async head(path) {
      // Supabase legacy objects have no guaranteed digest metadata. Used only
      // by offline tooling; routine delivery never reads object metadata.
      const result = await this.download(path);
      return result.data ? { data: { byteSize: result.data.byteLength }, error: null } : { error: "media-head-failed" };
    },
  };
}
