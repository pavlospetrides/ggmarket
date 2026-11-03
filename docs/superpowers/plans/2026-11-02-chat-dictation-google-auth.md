# Full-screen chat, native iOS dictation, and Google authentication implementation plan

1. Add regression tests for native text composition, VisualViewport changes, callback provider errors, safe redirects, and Google OAuth initiation.
2. Remove the mobile container constraint while retaining the desktop conversation grid and existing VisualViewport cleanup.
3. Keep the existing text-message API, Realtime reconciliation, permissions, and Supabase schema unchanged.
4. Treat Apple keyboard Dictation as ordinary text input; do not request website microphone access or add audio-message infrastructure.
5. Verify focus, safe-area, scrolling, toolbar expansion/collapse, repeated keyboard cycles, and composer cleanup in mobile WebKit and Chromium.
6. Add the Google button and official Supabase OAuth initiation; harden callback cancellation/error handling and safe return destinations.
7. Run focused checks, full TypeScript/ESLint/Vitest/Playwright gates, production build and `next start` HTML/RSC smoke tests. Review the complete diff and generated artifacts.
