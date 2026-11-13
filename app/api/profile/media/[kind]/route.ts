import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { buildProfileMediaPath, processProfileMedia, type ProfileCrop, type ProfileMediaKind } from "@/lib/profile-media";
import { cleanupProfileMedia, profileMediaBucket } from "@/lib/profile-media-storage";
import { readLimitedMultipartForm } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ kind: string }> };
const mediaColumn = (kind: ProfileMediaKind) => kind === "avatar" ? "avatar_path" : "cover_path";

async function context(kind: string) {
  if (kind !== "avatar" && kind !== "cover") return { error: NextResponse.json({ error: "Not found." }, { status: 404 }) } as const;
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) } as const;
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return { error: NextResponse.json({ error: "Profile media is unavailable." }, { status: 503 }) } as const;
  const active = await supabase.rpc("is_active_user");
  if (active.error) return { error: NextResponse.json({ error: "Profile media is unavailable." }, { status: 503 }) } as const;
  if (active.data !== true) return { error: NextResponse.json({ error: "Profile media is not permitted." }, { status: 403 }) } as const;
  return { user, supabase, admin, kind } as const;
}

async function currentPath(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, userId: string, column: "avatar_path" | "cover_path") {
  const result = await supabase.from("profiles").select("avatar_path,cover_path").eq("id", userId).maybeSingle();
  if (result.error || !result.data) throw new Error("Profile unavailable.");
  return result.data[column] as string | null;
}

async function changePath(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, userId: string, column: "avatar_path" | "cover_path", prior: string | null, next: string | null) {
  let query = supabase.from("profiles").update({ [column]: next }).eq("id", userId);
  query = prior === null ? query.is(column, null) : query.eq(column, prior);
  return query.select("avatar_path,cover_path").maybeSingle();
}

export async function POST(request: Request, { params }: Context) {
  const ctx = await context((await params).kind);
  if ("error" in ctx) return ctx.error!;
  const { user, supabase, admin, kind } = ctx;
  const form = await readLimitedMultipartForm(request);
  const file = form?.get("image");
  const cropText = form?.get("crop");
  if (!(file instanceof File) || file.size === 0 || file.size > 10_485_760 || typeof cropText !== "string" || cropText.length > 256 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "Choose a JPEG, PNG or WebP image up to 10 MB." }, { status: 400 });
  }
  const claim = await supabase.rpc("claim_profile_media_upload");
  if (claim.error) return NextResponse.json({ error: "Upload is unavailable." }, { status: 503 });
  if (claim.data !== true) return NextResponse.json({ error: "Too many uploads. Try again in an hour." }, { status: 429 });
  let crop: ProfileCrop;
  let bytes: Uint8Array;
  try {
    crop = JSON.parse(cropText) as ProfileCrop;
    bytes = await processProfileMedia(new Uint8Array(await file.arrayBuffer()), kind, crop, file.type);
  } catch { return NextResponse.json({ error: "Upload a valid image and crop." }, { status: 400 }); }

  const path = buildProfileMediaPath(user.id, kind, randomUUID());
  const column = mediaColumn(kind);
  let prior: string | null;
  try { prior = await currentPath(supabase, user.id, column); }
  catch { return NextResponse.json({ error: "Profile is unavailable." }, { status: 503 }); }
  const reserved = await admin.from("profile_media_reservations").insert({ path, owner_id: user.id, kind });
  if (reserved.error) return NextResponse.json({ error: "Upload is unavailable." }, { status: 503 });
  let bucket: ReturnType<typeof profileMediaBucket>;
  try { bucket = profileMediaBucket(); }
  catch { return NextResponse.json({ error: "Image storage is unavailable." }, { status: 503 }); }
  const stored = await bucket.upload(path, bytes, { contentType: "image/webp", cacheControl: "300", upsert: true });
  if (stored.error) {
    await admin.from("profile_media_cleanup_jobs").insert({ path, owner_id: user.id, kind });
    await cleanupProfileMedia(admin, user.id, kind);
    return NextResponse.json({ error: "Image could not be stored." }, { status: 503 });
  }

  const updated = await changePath(supabase, user.id, column, prior, path);
  if (updated.error || !updated.data) {
    // An ambiguous response may be a committed update. Re-read before cleanup.
    let actual: string | null;
    try { actual = await currentPath(supabase, user.id, column); }
    catch {
      // A job tombstones this unique path so a late metadata update cannot
      // attach an object that cleanup may already be deleting.
      await admin.from("profile_media_cleanup_jobs").insert({ path, owner_id: user.id, kind });
      return NextResponse.json({ error: "Upload status is uncertain. Refresh your profile." }, { status: 503 });
    }
    if (actual !== path) {
      await admin.from("profile_media_cleanup_jobs").insert({ path, owner_id: user.id, kind });
      await cleanupProfileMedia(admin, user.id, kind);
      return NextResponse.json({ error: "Profile changed during upload. Try again." }, { status: 409 });
    }
  }
  const cleanup = await cleanupProfileMedia(admin, user.id, kind);
  return NextResponse.json({ path, cleanupPending: cleanup.pending }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: Context) {
  const ctx = await context((await params).kind);
  if ("error" in ctx) return ctx.error!;
  const { user, supabase, admin, kind } = ctx;
  const column = mediaColumn(kind);
  let prior: string | null;
  try { prior = await currentPath(supabase, user.id, column); }
  catch { return NextResponse.json({ error: "Profile is unavailable." }, { status: 503 }); }
  if (!prior) return NextResponse.json({ ok: true });
  const updated = await changePath(supabase, user.id, column, prior, null);
  if (updated.error || !updated.data) {
    let actual: string | null;
    try { actual = await currentPath(supabase, user.id, column); }
    catch { return NextResponse.json({ error: "Removal status is uncertain. Refresh your profile." }, { status: 503 }); }
    if (actual !== null) return NextResponse.json({ error: "Profile changed during removal. Try again." }, { status: 409 });
  }
  const cleanup = await cleanupProfileMedia(admin, user.id, kind);
  return NextResponse.json({ ok: true, cleanupPending: cleanup.pending });
}
