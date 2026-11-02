# GGMarket SQL Injection Security Report

## Scope and conclusion

- Database-connected entry points inventoried: **40**
- Locally automatable targets: **16**
- User-controlled parameter groups inventoried: **107**
- Parameter groups tested in this report generation run: **46**
- Confirmed SQL injection vulnerabilities: **0**
- Production requests made while generating this baseline: **0**

Scanner output is never sufficient for confirmation. A finding remains suspected until reproduced and matched to a source-level SQL sink.

## Result totals

- false_positive: **2**
- not_injectable: **14**
- not_run: **24**

## Results

| Target | Method | Route | Status | Evidence |
|---|---|---|---|---|
| `page-marketplace-search` | GET | `/marketplace` | false_positive | SQLMap rejected its preliminary signal |
| `page-search` | GET | `/search` | false_positive | SQLMap rejected its preliminary signal |
| `page-listing-detail` | GET | `/listing/{id}` | not_injectable | SQLMap found no injectable parameter |
| `page-public-profile` | GET | `/profile/{username}` | not_injectable | SQLMap found no injectable parameter |
| `api-reviews-get` | GET | `/api/reviews` | not_injectable | SQLMap found no injectable parameter |
| `api-reviews-post` | POST | `/api/reviews` | not_injectable | SQLMap found no injectable parameter |
| `api-listings-create` | POST | `/api/listings` | not_run | static/manual target |
| `api-listings-update` | PATCH | `/api/listings/{id}` | not_run | static/manual target |
| `api-listings-delete` | DELETE | `/api/listings/{id}` | not_run | static/manual target |
| `api-listing-images-upload` | POST | `/api/listings/{id}/images` | not_run | static/manual target |
| `api-listing-image-delete` | DELETE | `/api/listing-images/{id}` | not_run | static/manual target |
| `api-favorites-post` | POST | `/api/favorites` | not_injectable | SQLMap found no injectable parameter |
| `api-recently-viewed` | POST | `/api/recently-viewed` | not_injectable | SQLMap found no injectable parameter |
| `api-conversations-create` | POST | `/api/conversations` | not_injectable | SQLMap found no injectable parameter |
| `api-messages-get` | GET | `/api/conversations/{id}/messages` | not_injectable | SQLMap found no injectable parameter |
| `api-messages-post` | POST | `/api/conversations/{id}/messages` | not_injectable | SQLMap found no injectable parameter |
| `api-offers-create` | POST | `/api/offers` | not_injectable | SQLMap found no injectable parameter |
| `api-offers-respond` | PATCH | `/api/offers/{id}` | not_run | static/manual target |
| `api-trades-create` | POST | `/api/trades` | not_injectable | SQLMap found no injectable parameter |
| `api-trades-respond` | PATCH | `/api/trades/{id}` | not_run | static/manual target |
| `api-saved-searches-create` | POST | `/api/saved-searches` | not_injectable | SQLMap found no injectable parameter |
| `api-saved-searches-update` | PATCH | `/api/saved-searches/{id}` | not_run | static/manual target |
| `api-notifications-get` | GET | `/api/notifications` | not_run | static/manual target |
| `api-notifications-patch` | PATCH | `/api/notifications` | not_run | static/manual target |
| `api-reports-create` | POST | `/api/reports` | not_injectable | SQLMap found no injectable parameter |
| `api-profile-update` | PATCH | `/api/profile` | not_run | static/manual target |
| `api-item-verification` | POST | `/api/verification/item` | not_injectable | SQLMap found no injectable parameter |
| `api-admin-reports` | PATCH | `/api/admin/reports` | not_run | static/manual target |
| `api-email-verification` | POST | `/api/verification/email` | not_run | static/manual target |
| `page-private-account-reads` | GET | `/profile, /favorites, /messages, /notifications, /saved-searches, /admin` | not_run | static/manual target |
| `page-conversation` | GET | `/messages/{id}` | not_run | static/manual target |
| `auth-login` | POST | `/auth/login` | not_run | static/manual target |
| `auth-register` | POST | `/auth/register` | not_run | static/manual target |
| `auth-forgot-password` | POST | `/auth/forgot-password` | not_run | static/manual target |
| `auth-logout` | POST | `/auth/logout` | not_run | static/manual target |
| `auth-callback` | GET | `/auth/callback` | not_run | static/manual target |
| `rpc-search-listings` | RPC | `Supabase RPC search_listings` | not_run | static/manual target |
| `rpc-marketplace-mutations` | RPC | `Supabase offer/trade/conversation RPCs` | not_run | static/manual target |
| `db-dynamic-sql-migrations` | SQL | `migration bootstrap/maintenance functions` | not_run | static/manual target |
| `db-security-definer-functions` | SQL | `SECURITY DEFINER functions and triggers` | not_run | static/manual target |

## Source review

No request-controlled raw SQL sink was identified. Application queries use Supabase/PostgREST builders or typed RPC arguments; sort branches and taxonomy keys are allowlisted. Migration EXECUTE/format uses catalog-derived or hard-coded identifiers with %I. SECURITY DEFINER functions reviewed in the hardened baseline use an empty search_path and schema-qualified objects.

### Prior bounded evidence

- Bounded disposable-lab SQLMap: listings PostgREST filter - no injectable parameter
- Bounded disposable-lab SQLMap: search_listings RPC JSON marker - no injectable parameter
- Bounded disposable-lab SQLMap: Next.js /search?q=console - no injectable parameter

The earlier live `/marketplace?q=ps5` operator scan concluded false positive or unexploitable; it was not repeated by this implementation.

## Remaining coverage

Authenticated and mutation-capable routes require disposable local accounts and fixture IDs. Static-only database functions require manual source review; absence of an automated result is not a pass.

## Safety

Production mode is explicit opt-in, HTTPS, exact-host, exact-path, GET-only, and request-budgeted. It does not invoke SQLMap.
