# Lootriva Profile Media Design

## Intent

Give every authenticated Lootriva member a durable custom avatar and cover while preserving the existing profile layout, initials/gradient fallbacks, private Cloudflare R2 bucket, Supabase authorization, listing-image behavior, and My Lootriva Card animations.

This document records the approved brief supplied on 2026-11-12. It is the design authority for the implementation plan.

## Goals

- Owners can preview, crop, zoom, upload, replace, remove, and reset avatar and cover images from their profile and settings.
- Avatars are square, sharp on high-density displays, and consistently rendered anywhere the current marketplace presents seller identity.
- Covers retain the responsive profile-header shape and apply a dark readability scrim.
- Public seller profiles receive authorized media without exposing R2 credentials or persisting expiring URLs.
- Uploads are authenticated, owner-derived, suspended-user aware, bounded, content-validated, Sharp-decoded, WebP-normalized, rate-limited, and failure-safe.
- Replacement cleanup is retryable and can delete only database-snapshotted obsolete profile-media objects.

## Non-goals and anti-goals

- Do not change listing-image storage behavior or migrate existing production objects.
- Do not make the R2 bucket public, expose credentials, trust browser object keys/profile IDs, or store signed URLs in Supabase.
- Do not modify protected profile state, weaken RLS, deploy, merge, or apply production migrations automatically.
- Do not introduce a second visual system, disturb My Lootriva Card, or add Vercel image transformations for private media.

## Architecture

`profiles.avatar_path` remains the avatar metadata field. An additive migration adds `cover_path`, constrains both fields to server-generated `profile-media/<user-id>/<kind>/<uuid>.webp` keys, extends public column grants, and introduces an upload-rate ledger plus cleanup outbox. A trigger snapshots an old key only after profile metadata changes, so the active object is never deleted before replacement succeeds.

The browser supplies the selected source image and normalized crop rectangle. A Node.js route handler reads multipart data through the existing bounded reader, derives the owner from the authenticated session, checks `is_active_user`, claims a database-backed rate-limit slot, and uses Sharp to validate actual content/dimensions and render fixed WebP outputs (avatar 1024x1024; cover 2400x800). Object keys use server-generated UUIDs only. The route uploads the new object before an RLS-bound profile update, reconciles ambiguous metadata outcomes, and processes only cleanup jobs produced by the database.

Existing server data reads batch-sign distinct profile-media keys through the R2 adapter. Signed URLs are render-time data, never stored. A shared unoptimized media component refreshes the router once when an expired signature fails, matching the approved listing-media delivery pattern while avoiding Vercel transformations and continuous byte proxying.

The editor is an accessible Radix dialog with file selection, preview, drag positioning, zoom, keyboard controls, status announcements, and destructive confirmation. Crop math is deterministic and shared with tests; the server remains authoritative for decoding and output.

## Product behavior

- Avatar fallback: the current uppercase initial in the same circular treatment.
- Cover fallback: the current graphite/purple routing-board gradient.
- Owner-only controls: camera affordance on avatar and `Edit cover` in the banner; public viewers never receive editing controls.
- Settings shows dedicated Profile Photo and Cover Photo sections with upload/change, crop/reposition, and remove actions.
- Successful changes refresh server data immediately; errors retain the current active image.
- Mobile controls remain at least 44px, dialogs respect safe areas, focus is trapped/restored, and no horizontal overflow is introduced.

## Security and lifecycle decisions

- Accepted input formats: JPEG, PNG, and WebP by both declared MIME and Sharp-decoded format.
- Maximum source: 10 MiB, 12,000px per dimension, 40 megapixels, one frame.
- Upload limit: 10 successful claims per account per rolling hour, enforced in PostgreSQL.
- Cleanup never accepts a browser key. It consumes an owner/kind/key snapshot from `profile_media_cleanup_jobs`, validates the exact prefix, removes that object, and marks the job complete. Failed cleanup remains pending for retry.
- Removing/resetting sets only the relevant profile media column to null. Existing users need no backfill.

## Deployment boundary

The pull request includes, but does not apply, an additive SQL migration. Deployment order is migration in an isolated/approved Supabase target, server-only R2 environment verification, application deploy, smoke checks, then gradual production availability. Rollback first restores the prior application; additive nullable columns and pending cleanup rows remain safe for a forward fix.
