# Cookie, Auth Session, and Privacy Compliance Design

## Intent

Give GGMarket an evidence-backed cookie disclosure and safer Supabase session handling without inventing trackers, consent choices, business facts, or retention promises.

## Verified direction

- GGMarket currently uses only essential first-party authentication cookies plus narrowly scoped recovery and offline storage.
- No analytics, advertising, marketing pixels, tag managers, or third-party widgets are present in application source or the signed-out browser runtime.
- Do not show a consent banner or optional-purpose toggles while that remains true. Authentication storage is activated only when a user requests account functionality.
- Publish plain-language Cookie and Privacy pages, and expose both from a site-wide footer.
- Keep Supabase SSR cookies JavaScript-readable because the browser client refreshes and persists the session. Do not force `HttpOnly` and break the supported architecture.
- Add `Secure` to Supabase cookies in production only; keep HTTP development and LAN testing functional.
- Mark auth/session-changing redirects and authenticated proxy responses private and non-cacheable.

## Inventory contract

The user-facing disclosure must cover:

- Supabase's first-party `sb-<project-ref>-auth-token` cookie and possible numbered chunks, with `Path=/`, `SameSite=Lax`, production-only `Secure`, no `Domain`, JavaScript-readable, and a library maximum age of 400 days.
- The short-lived PKCE verifier cookie when email/auth callback flows need it.
- `sessionStorage` key `ggmarket-sw-recovery`, used only to prevent a reload loop and removed after successful hydration.
- production Cache Storage `ggmarket-shell-v3`, containing only `/offline` and `/icon.svg`; no authenticated pages or API responses.
- no application IndexedDB storage; Next.js development tooling may create `__next_debug_channel` only in development.
- Supabase as the observed authentication, database, storage, and Realtime service; contractual/controller details remain owner-review items.

## User experience

Cookie and Privacy pages use the existing midnight-exchange tokens and compact editorial sections. The global footer exposes `Cookie policy` and `Privacy policy` on every route. There is no blocking overlay, no consent cookie, and no change to Sell, Chat, Login, or Signup flows.

## Owner review

Before launch, the owner or counsel must provide or confirm the controller's legal name, address and privacy contact, lawful bases and retention schedule, processor/transfer disclosures and agreements, Supabase Auth session/JWT settings, and the final Cyprus/EU legal text.

