import "server-only";
import { isOwnedProfileMediaPath, type ProfileMediaKind } from "./profile-media";

type Selection = { ownerId: string; kind: ProfileMediaKind; path: string | null | undefined };
type Signer = { createSignedUrls(paths: string[], expiry: number): PromiseLike<{ data?: Array<{ path: string; signedUrl: string }>; error: unknown | null }> };

// Selections must come from an RLS-authorized profile query. The path check is
// defense in depth; it does not grant authorization to browser supplied keys.
export async function signAuthorizedProfileMedia(selections: Selection[], storage: Signer): Promise<Array<string | undefined>> {
  const paths = [...new Set(selections.flatMap((item) => item.path && isOwnedProfileMediaPath(item.path, item.ownerId, item.kind) ? [item.path] : []))];
  if (!paths.length) return selections.map(() => undefined);
  const result = await storage.createSignedUrls(paths, 3600);
  if (result.error || !result.data) throw new Error("Profile media signing unavailable.");
  const signed = new Map(result.data.map((item) => [item.path, item.signedUrl]));
  return selections.map((item) => item.path && isOwnedProfileMediaPath(item.path, item.ownerId, item.kind) ? signed.get(item.path) : undefined);
}
