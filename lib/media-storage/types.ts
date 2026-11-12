export type StorageReply<T = undefined> = { data?: T; error: unknown | null };
export type UploadOptions = { contentType: string; cacheControl: string; upsert: true; sha256?: string };
export interface MediaStorage {
  upload(path: string, bytes: Uint8Array, options: UploadOptions): PromiseLike<StorageReply>;
  remove(paths: string[]): PromiseLike<StorageReply>;
  createSignedUrls(paths: string[], expiresIn: number): PromiseLike<StorageReply<Array<{ path: string; signedUrl: string }>>>;
  download(path: string): PromiseLike<StorageReply<Uint8Array>>;
  head(path: string): PromiseLike<StorageReply<{ byteSize: number; sha256?: string }>>;
}

export function assertObjectKey(path: string) {
  if (!path || path.length > 1024 || !/^[a-zA-Z0-9_./-]+$/.test(path) || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid media object key.");
  }
}

export function assertExpiry(seconds: number) {
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) throw new Error("Invalid media URL lifetime.");
}
