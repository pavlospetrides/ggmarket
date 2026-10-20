# iPhone interaction stabilization design

## Objective

Make GGMarket controls resilient to iPhone Safari hydration, touch delivery, LAN-origin, navigation, and authentication edge cases without changing the approved visual direction or weakening Supabase security.

## Architecture

Essential authentication and persistence controls use progressive same-origin form fallbacks in addition to their hydrated client behavior. Shared request-origin resolution preserves the browser-visible LAN/deployment host. The service worker must not serve stale application JavaScript. Non-essential rich controls retain client behavior but expose safe native fallbacks where practical, with outcome-based mobile tests for touch, navigation, state, and feedback.

## Safety and evidence

- No mutation-enabled tests against the configured protected Supabase project.
- Mocked UI/API tests are reported as simulated, not backend persistence proof.
- Physical iPhone status remains unverified until the user completes the short final smoke test.
- Preserve existing taxonomy, redesign, migrations, RLS, secrets, and production data.
- No commits, pushes, or deployments.

## Required batches

1. Authentication: Login regression, Signup, Logout, host/cookie behavior.
2. Product interactions: Favorites, gallery, listing actions.
3. Mobile navigation: visible Favorites destination without a sixth item.
4. Full interaction audit: outcome coverage for every route family and shared infrastructure.
5. Comprehensive Chromium/WebKit, unit, static, build, accessibility, and screenshot verification.
