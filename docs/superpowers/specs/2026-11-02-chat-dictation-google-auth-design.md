# Full-screen chat, native iOS dictation, and Google authentication design

## Scope

Extend GGMarket's existing full-screen conversation and Supabase SSR authentication architecture. Keep text messaging, offers, Realtime, email/password login, ownership, and RLS behavior unchanged.

## Chat and native dictation

- Keep the existing VisualViewport-driven conversation shell and remove the mobile `container-page` constraint so the active conversation is edge-to-edge.
- Treat Apple keyboard Dictation as normal text composition in the existing textarea and send its result through the existing text-message route.
- Keep the composer aligned to the live VisualViewport through keyboard, Dictation, and Safari toolbar changes while preserving focus, safe-area insets, and message-history scrolling.
- Do not request browser microphone permission or add MediaRecorder, audio uploads, playback UI, Storage buckets, or message schema changes.

## Google authentication

- Add one Google action to the shared login/register form; email/password remains primary and unchanged.
- Start the official Supabase `signInWithOAuth({ provider: "google" })` flow with the existing same-origin callback URL and validated `next` destination.
- Reuse `/auth/callback` and `exchangeCodeForSession`; handle provider cancellation/error without exchanging a missing code.
- Rely on Supabase's verified-email automatic identity linking. Never merge profiles in application code and never overwrite profile fields with Google metadata.
- Continue using the existing `auth.users` trigger for exactly-one profile creation and UUID-based ownership.

## Security and failure behavior

- All authorization derives from `auth.uid()` and existing conversation membership. Client user IDs are never accepted.
- OAuth return paths must be local absolute paths without protocol-relative, backslash, control-character, or encoded separator ambiguity.
- OAuth pending states are explicit, accessible, and cleared on failure.

## Verification

Add unit tests for the text-only contract, redirect handling, and callback errors; Playwright coverage for viewport widths, dictation-style composition, toolbar and keyboard transitions, layout cleanup, and Google initiation; then run static checks, full Vitest, Chromium/WebKit, build, production server smoke tests, and diff checks. Physical-device acceptance remains required because desktop WebKit emulation cannot activate Apple's native keyboard Dictation.
