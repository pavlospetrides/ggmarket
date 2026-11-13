# Seller Growth Program Design

## Intent

Build a trustworthy seller-acquisition program that rewards genuine marketplace participation without turning a profile review into an identity guarantee. Verification, founder scarcity, promotions, and referrals remain distinct signals with separate audit histories and controls.

## Product decisions

- Reuse `public.seller_verifications`; `verified` remains the database approval value for compatibility and is presented as “Seller reviewed” rather than “Identity verified.”
- Collect a seller statement and marketplace evidence only. No identity documents, biometrics, or sensitive evidence are accepted in this phase.
- Rejection permits a new application after seven days; no seller may have more than one pending application or submit more than three applications in 30 days.
- “Request more information” returns the same application to the seller and records an immutable decision event.
- Founder eligibility is the later of seller-verification approval and the first legitimate active listing. A PostgreSQL advisory lock serializes allocation; eligible sellers are ordered by that timestamp and UUID, and slots are unique integers 1–100.
- Founder badge and promotion entitlement are separate. The badge remains active while the account is in good standing; promotion may be suspended/revoked independently.
- Founder entitlement is one 30-day campaign, starting on first activation. Referral rewards are one 3-day entitlement each. A seller can have only one active campaign and can feature only an owned, active listing.
- Featured ordering uses deterministic daily rotation and one active campaign per seller. Organic results remain separate and usable.
- Referral attribution uses an HttpOnly, SameSite=Lax cookie containing only an opaque public referral code. It is claimed after authenticated signup/confirmation, never on link open. Qualification requires confirmed email, a seven-day eligible listing, good standing, and fraud checks. Reward issuance is idempotent and capped at five per calendar month.
- All four features default off through server-only environment variables. Disabling a flag hides entry points and rejects new transitions but preserves records.

## Architecture

One additive migration extends the current verification model and adds immutable audit, founder, promotion, referral, and reward-ledger tables. Narrow `SECURITY DEFINER` functions validate `auth.uid()`, ownership, admin status, account standing, state transitions, and limits; RLS denies direct cross-account access.

Next.js route handlers authenticate every mutation and apply feature flags before invoking database RPCs. Server components read only the minimum public or owner/admin data. Shared badge components explain what each signal means. The account growth page joins verification, founder/promotion, and referral dashboards; the existing admin area links to a protected management page.

## Security and privacy

- No client-supplied user or admin identity is authoritative.
- No public bucket or marketplace image path stores verification evidence.
- Audit and reward ledgers reject updates/deletes.
- Unique and partial indexes prevent duplicate pending applications, founder slots, reward issuance, and concurrent active campaigns.
- Referral codes are public identifiers, not bearer credentials; cookies are HttpOnly and attribution is revalidated server-side.
- Existing professional/trader (`seller_type`) status is untouched.
- Production migration, flags, scheduling, and document collection require separate owner approval.

## Rollout and rollback

Deploy code with all flags false, validate migration in disposable Supabase, then enable verification, founders/featured, and referrals independently. Roll back behavior by disabling flags. Do not delete program data; use revocation/suspension transitions and a forward migration for schema corrections.

