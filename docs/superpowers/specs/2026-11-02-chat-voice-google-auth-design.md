# Chat, voice messages, and Google authentication design

## Scope

Extend GGMarket's existing full-screen conversation and Supabase SSR authentication architecture. Keep text messaging, offers, Realtime, email/password login, ownership, and RLS behavior unchanged.

## Chat and voice

- Keep the existing VisualViewport-driven conversation shell and remove the mobile `container-page` constraint so the active conversation is edge-to-edge.
- Model voice messages as ordinary participant-authorized messages with additive metadata: `message_type`, private `attachment_path`, `attachment_mime`, and bounded `attachment_duration_ms`.
- Store audio in a private `message-audio` bucket under `<conversation>/<sender>/<uuid>.<ext>`.
- Permit Storage reads only to conversation members, inserts only to the authenticated sender folder when that sender is a member, and deletes only to the owner. Do not add public reads.
- Upload and insert the message through one authenticated route. If insertion fails after upload, remove the just-uploaded object. The existing client UUID uniqueness prevents duplicate messages.
- Request `getUserMedia({ audio: true, video: false })`, select a supported MIME type, stop every track on stop/cancel/unmount, and revoke all preview URLs.
- Render audio through an authenticated blob fetch so private bucket URLs are never made public. Revoke playback URLs when the bubble unmounts.

## Google authentication

- Add one Google action to the shared login/register form; email/password remains primary and unchanged.
- Start the official Supabase `signInWithOAuth({ provider: "google" })` flow with the existing same-origin callback URL and validated `next` destination.
- Reuse `/auth/callback` and `exchangeCodeForSession`; handle provider cancellation/error without exchanging a missing code.
- Rely on Supabase's verified-email automatic identity linking. Never merge profiles in application code and never overwrite profile fields with Google metadata.
- Continue using the existing `auth.users` trigger for exactly-one profile creation and UUID-based ownership.

## Security and failure behavior

- All authorization derives from `auth.uid()` and existing conversation membership. Client user IDs are never accepted.
- Voice MIME, size, duration, IDs, and multipart body are bounded server-side.
- OAuth return paths must be local absolute paths without protocol-relative, backslash, control-character, or encoded separator ambiguity.
- Recording, upload, and OAuth pending states are explicit, cancellable where possible, accessible, and always cleared on failure.

## Verification

Add unit tests for voice format/validation, message mapping, redirect handling, and callback errors; Playwright coverage for viewport widths, recorder lifecycle, upload success/failure/cancel, cleanup, and Google initiation; then run static checks, full Vitest, Chromium/WebKit, build, production server smoke tests, and diff checks.
