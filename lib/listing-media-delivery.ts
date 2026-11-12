import "server-only";
import { storedMediaProvider } from "./media-storage";
import type { MediaStorageProvider } from "./media-storage/config";
import type { MediaStorage } from "./media-storage/types";
import { assertObjectKey } from "./media-storage/types";
import { listingImageObjectPaths } from "./listing-media-storage";

type Factory = (provider: MediaStorageProvider) => MediaStorage;
type Selection = { path: string; provider?: string | null };

// Inputs must come from the caller's RLS query. This helper does not accept
// browser paths and is never an authorization substitute.
export async function signAuthorizedListingImages(selections: Selection[], storage: Factory, expiresIn = 3600): Promise<string[]> {
  const groups = new Map<MediaStorageProvider, Set<string>>();
  for (const selection of selections) {
    const provider = storedMediaProvider(selection.provider);
    const paths = groups.get(provider) ?? new Set<string>();
    paths.add(selection.path); groups.set(provider, paths);
  }
  const urls = new Map<string, string>();
  await Promise.all([...groups].map(async ([provider, paths]) => {
    const result = await storage(provider).createSignedUrls([...paths], expiresIn);
    if (result.error || !result.data) throw new Error("Media signing unavailable.");
    for (const row of result.data) if (row.signedUrl) urls.set(`${provider}:${row.path}`, row.signedUrl);
  }));
  return selections.map(({ path, provider }) => {
    const url = urls.get(`${storedMediaProvider(provider)}:${path}`);
    if (!url) throw new Error("Media signing unavailable.");
    return url;
  });
}

type StoredImage = { storage_path: string; card_path?: string | null; detail_path?: string | null; storage_provider?: string | null };

export function prepareStoredListingImageRemoval(rows: StoredImage[], storage: Factory) {
    const groups = new Map<MediaStorageProvider, Set<string>>();
    for (const row of rows) {
      const provider = storedMediaProvider(row.storage_provider);
      const paths = groups.get(provider) ?? new Set<string>();
      listingImageObjectPaths(row).forEach((path) => { assertObjectKey(path); paths.add(path); }); groups.set(provider, paths);
    }
    const operations = [...groups].map(([provider, paths]) => ({ bucket: storage(provider), paths: [...paths] }));
    return async (): Promise<{ error: string | null }> => {
      try {
        const results = await Promise.all(operations.map(({ bucket, paths }) => bucket.remove(paths)));
        return { error: results.some((result) => result.error) ? "media-cleanup-pending" : null };
      } catch { return { error: "media-cleanup-pending" }; }
    };
}

export async function removeStoredListingImages(rows: StoredImage[], storage: Factory): Promise<{ error: string | null }> {
  try { return await prepareStoredListingImageRemoval(rows, storage)(); }
  catch { return { error: "media-cleanup-pending" }; }
}
