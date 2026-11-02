# GGMarket Global Animated Loading System Design

This document records the implementation decisions for the user-supplied specification in `C:\Users\Pavlos\.codex\attachments\02fb124f-54db-4d95-a8fd-f17d3d50f518\Pasted text.txt`.

## Intent

Use the supplied circle, triangle, and square SVG animation as GGMarket's single loading indicator whenever a user is genuinely waiting for route content or an important foreground mutation. Loading feedback must make pending work legible without replacing useful content, disturbing restored marketplace state, delaying rendering, or creating a second navigation system.

## Architecture

- Add a dependency-free, server-compatible `Loader2` primitive in `components/ui/loader-2.tsx`, with a compatibility `Component` export, compact/standard sizing, optional delayed reveal, accessible status text, and a decorative mode for labelled buttons.
- Keep all animation rules in `components/ui/loader-2.module.css` so the supplied geometry and dash animations are isolated from GGMarket's theme. Use existing purple tokens and respect reduced motion.
- Use `app/loading.tsx` as the shared App Router fallback, while the existing nearer Browse and Marketplace boundaries reuse the same route presentation. The root layout remains mounted, so the header/navigation stay available.
- Use a 150 ms CSS-only reveal delay for client-controlled pending indicators. This suppresses flashes without delaying the operation or rendering.
- Preserve content during marketplace transitions and show an inline pending region. Preserve optimistic messages, background realtime updates, and existing error handling. Preserve upload state text; the current Supabase upload API exposes no byte-progress callback, so no fake percentage will be introduced.
- Add compact decorative loader instances to already-labelled foreground mutation controls in listing creation/editing, messaging, settings, saved searches, and notifications. State remains owned by the existing operation; `finally` blocks continue to clear it on success and failure.

## Scope decisions

- No dependencies, images, icons, providers, router monkey-patches, global busy context, artificial production delays, or database changes.
- No `useLinkStatus` integration: Next 16's bundled documentation recommends route-level `loading.tsx` when available, and this application retains prefetching. Inline link hints would duplicate the route fallback.
- Background notification refresh, realtime chat reconciliation, read receipts, typing events, and optimistic message sends do not receive the loader.
- GGMarket currently contains no My GG Card route or viewer. No speculative feature will be created; the shared loader is ready for a future lazy fallback and the absence will be reported.
- Fetching older messages is not implemented in the current chat UI. No loader is added for a nonexistent operation.

## Success conditions

The three original shapes render and animate with scoped purple styling; reduced-motion users receive a stable static mark; route fallbacks keep global navigation mounted; client indicators do not flash for sub-150 ms work; foreground failures clear their indicators and retain visible errors; marketplace browsing state and scroll restoration are not reset by loader state.
