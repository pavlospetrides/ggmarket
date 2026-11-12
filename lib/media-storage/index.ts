import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MediaStorageConfigurationError, resolveR2Config, type MediaStorageProvider } from "./config";
import { createR2Storage } from "./r2";
import { createSupabaseStorage } from "./supabase";
import type { MediaStorage } from "./types";

export function storedMediaProvider(value?: string | null): MediaStorageProvider {
  if (value == null || value === "supabase") return "supabase";
  if (value === "r2") return "r2";
  throw new MediaStorageConfigurationError();
}

export function createMediaStorage(provider: MediaStorageProvider, supabase: SupabaseClient): MediaStorage {
  return provider === "supabase" ? createSupabaseStorage(supabase) : createR2Storage(resolveR2Config(process.env));
}
