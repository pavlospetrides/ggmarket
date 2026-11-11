# Production email verification configuration

These values are required for the canonical Lootriva deployment. Dashboard changes are manual and must not be inferred from repository state.

## Supabase Auth

For password recovery, confirm the hosted Dashboard has these exact effective values in addition to the signup/OAuth settings below:

- Site URL: `https://lootriva.com`
- Redirect URL: `https://lootriva.com/auth/recovery`
- Redirect URL: `https://lootriva.com/auth/confirm-signup`
- Redirect URL: `https://lootriva.com/auth/callback`
- Reset password template: the complete contents of `docs/auth/reset-password-email.html`

- **Authentication → URL Configuration → Site URL:** `https://lootriva.com`
- **Authentication → URL Configuration → Redirect URLs:** add `https://lootriva.com/**`. Retain `https://www.lootriva.com/**`, `https://ggmarket.eu/**`, `https://www.ggmarket.eu/**`, and `https://ggmarket-sage.vercel.app/**` temporarily only while already-issued links are handled by the secret-safe compatibility response.
- Keep localhost callback, recovery, and confirmation URLs only in the disposable local project. Do not use localhost as the Site URL in production.
- If authentication is enabled on Vercel Preview, use a disposable non-production Supabase project and add either the exact preview callback or a tightly scoped project preview pattern. Do not allow all `*.vercel.app` hosts and do not connect previews to production user data.
- **Authentication → Providers → Email:** enable email/password and require Confirm email.
- **Authentication → Email Templates → Confirm signup:** copy the complete HTML from `docs/auth/confirm-signup-email.html`. It links the token hash to the scanner-safe signup entry point.
- Disable link tracking in the SMTP/email provider. Link rewriting can break Supabase confirmation URLs.
- In **Authentication > Email Templates > Reset password**, copy the complete HTML from `docs/auth/reset-password-email.html`. It sends `TokenHash` with exact `type=recovery` to `https://lootriva.com/auth/recovery`.

Both templates intentionally use `TokenHash` and distinct canonical application entry points. Do not replace either anchor with `ConfirmationURL`: that Supabase `/auth/v1/verify` URL consumes the token on GET and its PKCE redirect can depend on the browser that initiated the request. Do not use `RedirectTo` as the visible anchor.

The reset template intentionally does not use `ConfirmationURL` or `RedirectTo`. `ConfirmationURL` verifies at Supabase and returns a PKCE authorization code, whose verifier exists only in the browser that requested the email. `RedirectTo` is still supplied as the canonical recovery endpoint and must be allowed in URL Configuration, but the production template pins the visible link to Lootriva and sends `TokenHash` directly so Gmail or another browser can complete recovery.

Neither email-link GET calls `verifyOtp`. Each validates its fixed token type, stores the hash for ten minutes in a flow-scoped HttpOnly, SameSite=Lax, production-Secure cookie, and redirects to a clean confirmation page that does not depend on the cookie being included during that cross-site redirect. Only the user's explicit same-origin POST consumes the token. Lax is deliberate: Strict was omitted by Chromium during an external-origin email navigation and immediate redirect; `None` is never used. Origin/Fetch-Metadata checks still reject cross-site mutations. Keep Resend click tracking disabled.

## Vercel

Set these Production environment variables:

- `NEXT_PUBLIC_SITE_URL=https://lootriva.com` (Production scope only)
- `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<the project's public anon key>`
- `SUPABASE_URL=https://<project-ref>.supabase.co`
- `SUPABASE_SECRET_KEY=<server-only secret required by the authorized image-normalization endpoint>`
- `ADMIN_EMAILS=<existing comma-separated admin allowlist>`

`SUPABASE_SECRET_KEY` is not needed by email verification itself, but the application requires a privileged server key for authorized image normalization. The legacy `SUPABASE_SERVICE_ROLE_KEY` remains a supported fallback for manually configured projects. Never prefix either privileged key with `NEXT_PUBLIC_`, expose it to client code, or reuse it in Preview deployments. Leave `NEXT_PUBLIC_SITE_URL` unset in Preview: the application validates and uses Vercel's `VERCEL_URL` there. After changing an environment variable, create an authorized new deployment so the value is present in the server and browser build.

## Flow contract

Initial signup and resend pass `https://lootriva.com/auth/confirm-signup` as `emailRedirectTo`. The production template links there with `token_hash` and exact `type=email`. GET stages only; **Verify email and continue** POST calls `verifyOtp({ token_hash, type: "email" })`, requires a returned confirmed session and active account, then redirects to the existing `/settings/verification?status=verified&welcome=1` experience. A consumed or failed link never receives the welcome state. `/auth/callback` remains the OAuth/legacy code-exchange endpoint; old token-hash callback links are bridged to the typed staging routes without verification on GET.

## Domain routing checks

- In Vercel Domains, attach both `lootriva.com` and `www.lootriva.com` to the production deployment without a Vercel domain-level redirect. Requests to `www` must reach the application proxy, which clears inherited fragments and strips token/code-bearing URLs before issuing the permanent apex redirect.
- Keep the generated project hostname assigned to the project. The application performs exact-host compatibility handling for retired hosts while leaving all other Vercel preview hostnames untouched.
- Verify `/auth/callback`, `/sitemap.xml`, and `/robots.txt` after the next authorized deployment. Do not test by changing production users or issuing real customer emails.
- With an isolated new account, inspect the Confirm signup anchor without sharing it: it must start with `https://lootriva.com/auth/confirm-signup?token_hash=` and include `type=email`. Opening it must show **Confirm your email** before verification, then reach the existing Welcome panel only after the explicit button is pressed.

## Password recovery flow contract

Password recovery passes `https://lootriva.com/auth/recovery` as `redirectTo`. The reset template links to that endpoint with `token_hash` and `type=recovery`; the GET stages but does not verify the token. The confirmation POST accepts no other OTP type, calls `verifyOtp`, confirms the account is active, and persists the resulting recovery session in secure, SameSite=Lax SSR cookies. `/reset-password` and `/auth/update-password` both require a verified JWT `amr` entry whose method is `recovery`. The update route validates both fields, calls `updateUser({ password })`, signs out the local recovery session, and then shows confirmation. Expired, reused, malformed, and legacy PKCE failures remain in the recovery UI and never become Google OAuth errors.

Repository files cannot prove hosted Dashboard state. After installing the template, send a reset only to an isolated test account and inspect the received anchor before production rollout: it must start with `https://lootriva.com/auth/recovery?token_hash=` and include `type=recovery`; it must not use the Supabase `/auth/v1/verify` `ConfirmationURL`. Confirm that opening the link first shows **Continue password reset**, and that the password screen appears only after pressing the confirmation button. Never paste the received URL or token into logs or deployment notes.

## Manual dashboard gate

The following values remain unverified until an authorized operator inspects the hosted Production project: Site URL, redirect allowlist, Reset password HTML/subject, Confirm signup HTML/subject, SMTP host/secret, and sender identity. Verify the sender is exactly `Lootriva <no-reply@lootriva.com>`. A repository test passing does not satisfy this gate; retain redacted screenshots or a checklist result without copying token-bearing URLs.

See `docs/operations/lootriva-cutover-runbook.md` for the ordered cross-provider cutover, fresh-email acceptance matrix, 30-day legacy allowlist review, and independent rollback controls.
