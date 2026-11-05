const MAX_PHOTO_BYTES = 10_485_760;
const MAX_PHOTOS = 8;
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class ListingUploadError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ListingUploadError";
  }
}

export function isTransientUploadStatus(status: number): boolean {
  return [408, 425, 429].includes(status) || status >= 500;
}

function abortError(): DOMException {
  return new DOMException("Upload cancelled.", "AbortError");
}

async function defaultDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timeout = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timeout);
      reject(abortError());
    }, { once: true });
  });
}

export async function retryListingUpload<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    signal?: AbortSignal;
    delay?: (milliseconds: number) => Promise<void>;
  } = {},
): Promise<T> {
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 3, 3));
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw abortError();
    try {
      return await operation();
    } catch (error) {
      if (options.signal?.aborted || (error instanceof DOMException && error.name === "AbortError")) throw error;
      const transient = error instanceof ListingUploadError && isTransientUploadStatus(error.status);
      if (!transient || attempt === maxAttempts) throw error;
      const milliseconds = 250 * 2 ** (attempt - 1);
      await (options.delay ?? ((duration) => defaultDelay(duration, options.signal)))(milliseconds);
    }
  }
  throw new Error("Upload retry limit reached.");
}

export function aggregateUploadProgress(progress: number[]): number {
  if (!progress.length) return 0;
  const normalized = progress.map((value) => Math.max(0, Math.min(100, value)));
  return Math.round(normalized.reduce((sum, value) => sum + value, 0) / normalized.length);
}

export function moveOrderedItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function selectListingPhotoFiles(currentCount: number, files: File[]) {
  const accepted: File[] = [];
  const rejected: Array<{ file: File; reason: "type" | "size" | "count" }> = [];
  for (const file of files) {
    if (!ALLOWED_PHOTO_TYPES.has(file.type)) rejected.push({ file, reason: "type" });
    else if (!file.size || file.size > MAX_PHOTO_BYTES) rejected.push({ file, reason: "size" });
    else if (currentCount + accepted.length >= MAX_PHOTOS) rejected.push({ file, reason: "count" });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

function uploadOnce(
  url: string,
  uploadId: string,
  file: File,
  sortOrder: number,
  onProgress: (percentage: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const cancel = () => request.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    request.open("POST", url);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      signal?.removeEventListener("abort", cancel);
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let message = `Photo ${sortOrder + 1} could not be uploaded.`;
      try {
        const body = JSON.parse(request.responseText) as { error?: unknown };
        if (typeof body.error === "string") message = body.error;
      } catch {
        // The status code still determines retry behavior.
      }
      reject(new ListingUploadError(message, request.status));
    });
    request.addEventListener("error", () => {
      signal?.removeEventListener("abort", cancel);
      reject(new TypeError("The network interrupted the image upload."));
    });
    request.addEventListener("abort", () => {
      signal?.removeEventListener("abort", cancel);
      reject(abortError());
    });
    const form = new FormData();
    form.set("uploadId", uploadId);
    form.set("image", file);
    form.set("sortOrder", String(sortOrder));
    request.send(form);
  });
}

export function uploadListingPhoto(
  listingId: string,
  file: File,
  sortOrder: number,
  onProgress: (percentage: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const uploadId = createClientUuid();
  return retryListingUpload(
    () => uploadOnce(`/api/listings/${listingId}/images`, uploadId, file, sortOrder, onProgress, signal),
    { signal },
  );
}
import { createClientUuid } from "@/lib/client-id";

