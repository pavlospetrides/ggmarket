# GGMarket Ultimate Premium Redesign Implementation Plan

**Goal:** Replace the rejected presentation with the researched Loadout Atlas direction across the existing frontend while preserving behavior and security.

**Architecture:** Keep App Router pages server-rendered and retain all data functions. Extend existing shared tokens and components, add only static campaign assets, and keep client boundaries limited to existing interactions.

## Ledger

- [x] Read repository instructions, rejected implementation, and current diff.
- [x] Inspect ten requested references at desktop/mobile where accessible; record blocks honestly.
- [x] Compare current GGMarket captures and identify the visible failure modes.
- [x] Deal three original directions and select `specimen-catalogue` / Loadout Atlas.
- [x] Generate, optimize, and inspect original desktop/mobile campaign assets.
- [x] Add failing regression assertions for the new hero/data contract and stable first paint.
- [x] Rebuild homepage and shared discovery components.
- [x] Refine shared navigation, marketplace, listing, auth, form, and account surfaces.
- [x] Verify the mobile filter sheet and update durable browser coverage.
- [x] Capture and critique desktop/mobile renders; fix the top visual issues.
- [x] Run accessibility and changed-component review.
- [x] Run TypeScript, ESLint, Vitest, production build, and safe Chromium/WebKit responsive coverage at all eight widths.

## Acceptance gates

- Homepage hero uses only original project assets, never listing media.
- Real inventory is neither duplicated nor fabricated and adapts to zero/one/many items.
- No section remains invisible when a browser or screenshot tool does not support scroll timelines.
- Navigation, search, filters, forms, messaging, favorites, saved searches, profiles, settings, and sell flows retain their public contracts.
- Every required route has no horizontal overflow at all eight widths.
- Mobile filter close, Escape, backdrop dismissal, initial focus, and focus restoration pass in Chromium and WebKit.
- Generated media is local WebP and delivered with responsive `next/image` sizing.
- Fresh typecheck, lint, Vitest, build, and E2E evidence is recorded before release readiness is claimed.
