# Supabase Egress Optimization Design

## Intent

Reduce avoidable Supabase requests and response bytes without weakening RLS, authentication, private-media access, Realtime messaging, or listing freshness. Production usage totals and historical spike attribution remain separate from code-derived evidence because Supabase Management API and dashboard logs are not available in this environment.

## Evidence and priorities

1. Active Supabase-hosted listing media is the largest confirmed payload risk. Three active legacy objects have no card/detail variants and total 4,000,125 bytes (1,333,375 bytes average), so card delivery falls back to originals. No production media will be changed by this branch.
2. Featured listing reads can fan out from one campaign query into as many as 60 `getListing` calls. Each listing invokes one listing query and three enrichment queries, plus media signing. The public read also invokes `expire_featured_campaigns` on every render even though the view already filters expired rows.
3. An open chat reconciles every 12 seconds while visible. Every reconciliation downloads up to 500 messages and performs Auth plus database reads even when Realtime is healthy.
4. List pages select detail-only fields (`description`, seller `bio`, and detail image paths). A production anonymous sample measured 7,193 bytes for five full rows versus 6,268 bytes for a card projection, a 12.9% raw database-payload reduction before enrichment.
5. Active categories are public, identical for every visitor, and currently queried on each route render. The measured response is 1,216 bytes for 12 rows.

## Design

- Split list/card and detail database projections. List reads retain every field used by cards and discovery filters but omit description, seller biography/location, and detail-only image metadata. Detail/edit reads keep the full projection.
- Add a bounded batch loader for known active listing IDs. Featured listings use one batch listing read and one shared enrichment pass, preserve campaign order and seller rotation, and stop mutating expiration state during public reads.
- Add an incremental message cursor to the existing authenticated GET route. The client sends the latest persisted `created_at`; healthy Realtime channels do not poll, while error/disconnected channels use a 60-second incremental fallback. Focus/online recovery remains incremental, subscriptions remain scoped, and cleanup remains explicit.
- Cache only the public active-category read for five minutes. No private, authenticated, personalized, authorization, notification, conversation, or media-signing result enters a shared cache.
- Document production measurements, historical limitations, monitoring thresholds, media remediation options, and rollout gates. The branch will not migrate objects, mutate production data, merge, or deploy.

## Non-goals and constraints

- Do not claim organization-level GB savings from local or anonymous measurements.
- Do not migrate/delete production media or change bucket privacy.
- Do not alter the category RLS correction in `202611200001_catalog_categories_read_policy.sql`.
- Do not cache authenticated data or authorization decisions across users.
- Do not change the standalone Admin application.
- Preserve message delivery, missed-event recovery, offers/trades, notification Realtime, Seller Verification, and moderation.

## Verification

Use Vitest regression tests to prove query fan-out, bounded projections, message cursor validation/query bounds, polling state decisions, subscription cleanup contracts, and public-only cache boundaries. Then run TypeScript, ESLint, complete Vitest, production build, npm audit, relevant RLS/security tests, and safe browser tests only if a disposable E2E target can be verified.
