# Chat, voice messages, and Google authentication implementation plan

1. Add failing unit/contract tests for voice metadata, file constraints, callback provider errors, safe redirects, and Google OAuth initiation.
2. Add an immutable migration for message metadata and a private audio bucket with conversation-member RLS policies and narrow grants.
3. Extend validation, message state, server data mapping, Realtime reconciliation, previews, and the message route without changing text semantics.
4. Add the authenticated audio upload/download API and cleanup-on-failure behavior.
5. Add recorder utilities, a focused voice composer control, and a private audio bubble; integrate them into the existing chat shell with accessible states and cleanup.
6. Remove the mobile container constraint while retaining the desktop conversation grid and existing VisualViewport cleanup.
7. Add the Google button and official Supabase OAuth initiation; harden callback cancellation/error handling and safe return destinations.
8. Expand Playwright harness coverage for mobile sizes, Chromium/WebKit, voice success/failure/cancel, layout stability, and OAuth initiation.
9. Run focused checks, full TypeScript/ESLint/Vitest/Playwright gates, production build and `next start` HTML/RSC smoke tests. Review the complete diff and generated artifacts.
10. Create a new feature branch, commit only intended files, push it to GitHub, and report the SHA/branch without merging or deploying.
