# GGMarket

GGMarket is a production-oriented gaming marketplace built with Next.js App Router, React, TypeScript, Tailwind CSS, PostgreSQL, and Supabase. It separates standardized catalog products from individual seller listings and is designed for direct buyer/seller communication rather than first-party inventory.

## Included

- Responsive home, marketplace/search, listing detail, seller profile, favorites, settings, auth, sell wizard, listing management, and admin moderation routes
- Private buyer/seller conversations with persisted messages, optimistic sending, Realtime delivery, typing signals, presence, read tracking, offers, counteroffers, and item-plus-cash trade proposals
- Notification center and live unread bell, saved-search alerts, recently viewed listings, sale/wanted/trade intents, asking-price intelligence, item-ownership verification challenges, and installable PWA metadata
- Mobile-specific bottom navigation, filter sheet, sticky listing action bar, and step-by-step sell experience
- Supabase email/password authentication with SSR session refresh and automatic profile provisioning
- PostgreSQL schema with catalog/listing separation, JSONB category attributes, full-text and trigram search, indexes, RLS, and Storage policies
- Persistent favorites, reporting, review display model, verified seller model, and protected admin access
- Database-only marketplace reads with an explicit error boundary when Supabase is unavailable; runtime sample/fallback listings are intentionally not used

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your Supabase values.

3. Create a Supabase project and apply all migrations in order (or run `supabase db push` from a linked Supabase CLI project):

   - `supabase/migrations/202610010001_core_schema.sql`
   - `supabase/migrations/202610020001_phase1_stabilization.sql`
   - `supabase/migrations/202610030001_phase2_marketplace.sql`

4. Run `supabase/seed.sql` for categories, brands, and the initial product catalog.

5. Start development:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server | Public anon key; RLS remains authoritative |
| `SUPABASE_SERVICE_ROLE_KEY` | Test tooling only | Required by the destructive E2E/security audit cleanup; never expose in client or runtime code |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical origin and auth callback base |
| `ADMIN_EMAILS` | Server only | Comma-separated allowlist used as an additional admin route guard |

The service-role key is not used by application runtime code. It can be omitted unless running the real-database E2E or adversarial audit scripts.

## Supabase configuration

- In Authentication → URL Configuration, add `http://localhost:3000/auth/callback` locally and the equivalent production callback URL.
- Enable Email provider. Choose whether email confirmation is required for your environment.
- The migration creates the public `listing-images` bucket with a 10 MB per-file limit and JPEG/PNG/WebP restrictions.
- Create an account normally, then assign the first administrator only through a trusted SQL session:

  ```sql
  update public.profiles set is_admin = true where id = '<auth-user-uuid>';
  ```

  Also include that account email in `ADMIN_EMAILS`. Client profile updates cannot grant admin rights because of RLS.
- For production, configure custom SMTP and review Supabase Auth rate limits.
- In Realtime Settings, disable public channel access. Phase 2 typing and presence use private `conversation:<uuid>` channels whose authorization policies only admit conversation members.

## Quality commands

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The E2E suite creates temporary confirmed users and marketplace records in the configured project and removes them afterward. Run it only against a development/test Supabase project. The responsive suite checks real public routes at five mobile/tablet/desktop viewport sizes. Run the adversarial authorization audit with:

```bash
node --env-file=.env.local scripts/security-audit.mjs
node --env-file=.env.local scripts/phase2-security-audit.mjs
```

## Architecture notes

- `app/` contains routes and server boundaries; reusable UI lives in `components/`.
- `lib/` owns domain types, validation, auth helpers, Supabase clients, and database access.
- The database uses relational columns for common filters and JSONB for category-specific attributes. GIN indexes support attributes and search; trigram matching handles imperfect terms such as `4070 supr`.
- Authorization is enforced in PostgreSQL RLS. Page-level redirects improve UX but are not treated as security boundaries.
- Public pages render on the server where practical. Interactive islands are limited to filters, galleries, favorites, messages, auth, and the sell wizard.

## Current limitations

- Listing photos upload directly to the owner-scoped Supabase Storage path after the listing is created; server-side resizing and moderation remain deferred.
- Review creation remains closed until a transaction model can prove buyer eligibility. This prevents arbitrary review spam.
- Price intelligence is derived from at least three active asking prices, not completed-sale history, and the UI labels it accordingly.
- Identity and business verification are status architecture only until an external identity provider or explicit manual-review workflow is configured. GGMarket does not collect identity documents in the current implementation.
- Offline support is intentionally limited to a safe fallback shell and static assets; authenticated or personalized responses are never stored by the service worker.
- Payments, Stripe, checkout, escrow, shipping labels, and transaction processing are intentionally out of scope.
- Do not treat a deployment as release-ready until all three migrations are applied and both adversarial audit scripts pass against that exact Supabase project.
