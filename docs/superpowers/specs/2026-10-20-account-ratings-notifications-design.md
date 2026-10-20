# Account Verification, Ratings, and Notifications Design

## Intent

Make GGMarket's existing trust and communication systems usable and truthful on desktop and iPhone Safari without replacing the working authentication, marketplace, Favorites, Chat, or Supabase authorization architecture.

## Existing architecture and decisions

- Supabase Auth email confirmation is the account-email verification mechanism. A successful resend only means Supabase accepted the email request; only `user.email_confirmed_at` proves confirmation.
- `seller_verifications` is a separate manual seller-verification mechanism and remains the source of the public verified-seller badge. Item ownership challenges are also separate and must never imply account verification.
- `reviews` already stores ratings. There is no completed-sale record that reliably proves buyer/seller completion, so ratings will be described as community ratings, not verified-purchase reviews.
- The database already creates one recipient-only `notifications` row per message with a unique dedupe key. That table remains the notification source of truth.
- Persistent schema changes will be delivered as one additive migration and will not be applied to a remote project in this task.

## User-facing behavior

### Email verification

The verification settings page shows the authenticated user's actual email-confirmation state. Confirmed accounts display `Account verified successfully`. Unconfirmed accounts can request another Supabase signup-confirmation email, with a loading state, Supabase's server-side email rate limits, and a short client cooldown to prevent accidental repeated taps. The callback exchanges or verifies the supplied Supabase token, preserves a safe same-origin destination, and distinguishes success from invalid or expired links. Existing manual/item verification copy remains explicitly separate.

### Listing descriptions

Create and edit accept any trimmed description from 1 through 5,000 characters. Empty and whitespace-only values fail in shared runtime schemas and in PostgreSQL. Other listing validation is unchanged.

### Ratings

An authenticated user can rate another public profile from 1 through 5 stars with an optional plain-text review. Submission uses the authenticated server identity; client-supplied reviewer IDs are never accepted. One row per reviewer/target pair is enforced by PostgreSQL, and resubmission updates that row rather than increasing the count. Self-rating and suspended-account writes are denied. The dialog is touch-friendly and accessible, and the visible average, count, and review list update from the server response without refreshing. The UI does not claim a completed transaction or verified purchase. The existing report model only supports listing reports, so review-reporting is not expanded in this scope.

### Live notifications

A single root notification provider owns the authenticated account scope, initial fetch, filtered Supabase Realtime subscription, deduplication, reconnect/visibility reconciliation, and toast state. Desktop and mobile notification controls consume that provider, so multiple UI surfaces do not create duplicate subscriptions. Incoming recipient notifications update the badge and show one safe text toast; clicking a notification marks it read and opens its same-origin path. Account changes clear prior state before subscribing for the next user. Reading a conversation marks its corresponding unread message notifications read as well as updating the existing conversation receipt.

The mobile layout gains a compact top app bar containing the existing brand and notification bell; the five-item bottom navigation is unchanged. Toast placement stays above the bottom safe area.

## Security boundaries

- Authentication and reviewer identity are rechecked in Route Handlers.
- JSON input is runtime-validated with Zod and constrained by PostgreSQL checks.
- Review RLS permits public reads, authenticated self-owned inserts, and reviewer-owned rating/comment updates only.
- A unique database constraint prevents duplicate rating inflation under concurrency.
- Notification reads remain owner-scoped by both API filters and RLS; subscriptions include a user filter in addition to RLS.
- All user content is rendered through normal JSX escaping. Notification/review text is never inserted as HTML.
- Existing mutation-origin/CSRF protection remains in place.
- No client path introduces `crypto.randomUUID()`.

## Out of scope and deployment requirements

- No identity-provider integration, document upload, verified-purchase claim, browser-push subscription, service-worker push handler, or push-provider credentials are added.
- Background iPhone push requires HTTPS, Home Screen installation on supported iOS, explicit user permission, VAPID/provider infrastructure, and privacy-reviewed payloads. In-app Realtime notifications are implemented independently.
- The additive migration must be tested and applied to the intended Supabase environment through an authorized migration process before short descriptions and rating writes can work against that environment.
- Actual email delivery, hosted redirect allowlists, hosted Realtime publication state, and physical-iPhone behavior remain deployment/runtime verification items.

