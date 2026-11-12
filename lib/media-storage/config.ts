export type MediaStorageProvider = "supabase" | "r2";

type MediaStorageEnvironment = Record<string, string | undefined>;

export type R2Config = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
};

export class MediaStorageConfigurationError extends Error {
  constructor() {
    super("R2 media storage is unavailable.");
    this.name = "MediaStorageConfigurationError";
  }
}

function configured(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function resolveMediaStorageProvider(
  environment: MediaStorageEnvironment,
): MediaStorageProvider {
  const value = configured(environment.MEDIA_STORAGE_PROVIDER)?.toLowerCase() ?? "supabase";
  if (value !== "supabase" && value !== "r2") {
    throw new MediaStorageConfigurationError();
  }
  return value;
}

export function resolveR2Config(environment: MediaStorageEnvironment): R2Config {
  const accountId = configured(environment.R2_ACCOUNT_ID);
  const bucketName = configured(environment.R2_BUCKET_NAME);
  const accessKeyId = configured(environment.R2_ACCESS_KEY_ID);
  const secretAccessKey = configured(environment.R2_SECRET_ACCESS_KEY);
  if (
    !accountId ||
    !/^[a-f0-9]{32}$/i.test(accountId) ||
    !bucketName ||
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucketName) ||
    !accessKeyId ||
    !secretAccessKey
  ) {
    throw new MediaStorageConfigurationError();
  }
  return {
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}
