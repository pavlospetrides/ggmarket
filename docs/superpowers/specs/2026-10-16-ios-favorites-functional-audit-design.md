# iOS Compatibility, Favorites, and Functional Audit Design

## Intent

Stabilize GGMarket for production without changing its approved visual direction. The primary outcome is a truthful, accessible favorites interaction that stays synchronized across listing surfaces, persists through the existing authenticated Supabase contract, and behaves reliably with touch and WebKit. The same work audits existing controls for functional and mobile-interaction regressions without inventing new product behavior.

## Constraints

- Preserve the premium-minimal/neo-brutalist design system and completed PC hardware taxonomy.
- Keep the App Router, existing API routes, JSONB taxonomy, authentication, authorization, and Supabase RLS contracts.
- Do not mutate the configured Supabase project, run service-role tests, change migrations/RLS/secrets, install dependencies, commit, deploy, or push.
- Use safe mocked boundaries for mutation behavior and public read-only browser coverage for rendered routes.
- Treat Playwright WebKit mobile-touch emulation as browser-engine evidence, not proof of native iPhone Safari.

## Favorites contract

- A successful add is immediately represented by a red, filled heart and `aria-pressed=true`; a successful remove restores the unfilled state.
- Optimistic state rolls back on an API failure and exposes a visible and screen-reader-announced error.
- Unauthenticated requests enter the existing login flow without pretending the favorite was saved.
- In-flight interaction cannot create duplicate or out-of-order writes.
- Every mounted control for the same listing receives the same optimistic, confirmed, and rollback state.
- New server props after an App Router refresh reconcile with client state. This is required because `router.refresh()` preserves unaffected client `useState`.
- The existing `/api/favorites` route remains authenticated, validates listing identifiers, scopes every write to the current user, and relies on existing RLS.

## Functional audit contract

- Exercise public homepage, Browse, Marketplace, listing details, authentication entry points, profile redirects, and mobile navigation in Chromium and WebKit.
- Review client controls and route handlers for placeholder links, inert buttons, swallowed errors, unsafe nested interactivity, touch-target failures, overlay interception, and misleading enabled states.
- Validate authenticated-only behavior with pure/API fixtures and mocked browser requests unless a disposable Supabase project is separately authorized.
- Record routes that redirect safely and flows that cannot be persisted against the protected environment.

## Acceptance

Focused tests cover favorite add/remove, filled/unfilled rendering contract, server-prop reconciliation, shared-instance synchronization, repeated activation, failure rollback, unauthenticated routing, no accidental card navigation, and WebKit touch activation. Broader verification includes TypeScript, ESLint, all Vitest tests, production build, safe Chromium/WebKit browser checks, responsive mobile widths, keyboard/focus checks, screenshot inspection, and an evidence-based limitation report.
