import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { R2Config } from "./config";
import { assertObjectKey, assertExpiry, type MediaStorage } from "./types";

export function createR2Storage(config: R2Config, transport?: Pick<S3Client, "send">, sign = getSignedUrl): MediaStorage {
  const client = transport ?? new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 3,
  });
  return {
    async upload(path, bytes, options) {
      assertObjectKey(path);
      try {
        await client.send(new PutObjectCommand({ Bucket: config.bucketName, Key: path, Body: bytes, ContentLength: bytes.byteLength, ContentType: options.contentType, CacheControl: `private, max-age=${options.cacheControl}`, ...(options.sha256 ? { Metadata: { sha256: options.sha256 } } : {}) }));
        return { error: null };
      } catch { return { error: "media-upload-failed" }; }
    },
    async remove(paths) {
      paths.forEach(assertObjectKey);
      try {
        for (let offset = 0; offset < paths.length; offset += 1000) {
          const result = await client.send(new DeleteObjectsCommand({ Bucket: config.bucketName, Delete: { Objects: [...new Set(paths.slice(offset, offset + 1000))].map((Key) => ({ Key })), Quiet: true } }));
          if (result.Errors?.length) return { error: "media-remove-failed" };
        }
        return { error: null };
      } catch { return { error: "media-remove-failed" }; }
    },
    async createSignedUrls(paths, expiresIn) {
      paths.forEach(assertObjectKey);
      assertExpiry(expiresIn);
      try {
        const data = await Promise.all(paths.map(async (path) => ({ path, signedUrl: await sign(client as S3Client, new GetObjectCommand({ Bucket: config.bucketName, Key: path }), { expiresIn }) })));
        return { data, error: null };
      } catch { return { error: "media-sign-failed" }; }
    },
    async download(path) {
      assertObjectKey(path);
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: config.bucketName, Key: path }));
        if (!result.Body) return { error: "media-download-failed" };
        return { data: await result.Body.transformToByteArray(), error: null };
      } catch { return { error: "media-download-failed" }; }
    },
    async head(path) {
      assertObjectKey(path);
      try {
        const result = await client.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: path }));
        if (result.ContentLength === undefined) return { error: "media-head-failed" };
        return { data: { byteSize: result.ContentLength, sha256: result.Metadata?.sha256 }, error: null };
      } catch { return { error: "media-head-failed" }; }
    },
  };
}
