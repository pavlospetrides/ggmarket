# Production email verification configuration

These values are required for the canonical GGMarket deployment. Dashboard changes are manual and must not be inferred from repository state.

## Supabase Auth

For password recovery, confirm the hosted Dashboard has these exact effective values in addition to the signup/OAuth settings below:

- Site URL: `https://ggmarket.eu`
- Redirect URL: `https://ggmarket.eu/auth/recovery`
- Redirect URL: `https://ggmarket.eu/auth/callback`
- Reset password template: the complete contents of `docs/auth/reset-password-email.html`

- **Authentication → URL Configuration → Site URL:** `https://ggmarket.eu`
- **Authentication → URL Configuration → Redirect URLs:** add `https://ggmarket.eu/**` and `https://www.ggmarket.eu/**`. Retain `https://ggmarket-sage.vercel.app/**` temporarily for previously issued links while the application redirects that hostname to the canonical domain.
- Keep `http://localhost:3000/auth/callback` only for local development. Do not use localhost as the Site URL in the production Supabase project.
- If authentication is enabled on Vercel Preview, use a disposable non-production Supabase project and add either the exact preview callback or a tightly scoped project preview pattern. Do not allow all `*.vercel.app` hosts and do not connect previews to production user data.
- **Authentication → Providers → Email:** enable email/password and require Confirm email.
- **Authentication → Email Templates → Confirm signup:** copy the complete HTML from `docs/auth/confirm-signup-email.html`. It creates a real anchor whose `token_hash` is verified by the server callback with `verifyOtp`.
- Disable link tracking in the SMTP/email provider. Link rewriting can break Supabase confirmation URLs.
- In **Authentication > Email Templates > Reset password**, copy the complete HTML from `docs/auth/reset-password-email.html`. It sends `TokenHash` with exact `type=recovery` to `https://ggmarket.eu/auth/recovery`.

The template intentionally uses `TokenHash` and the canonical callback directly. Do not replace it with plain `{{ .TokenHash }}` text. Do not point `ConfirmationURL` at an application callback: `ConfirmationURL` is a Supabase `/auth/v1/verify` URL and represents a different flow.

The reset template intentionally does not use `ConfirmationURL` or `RedirectTo`. `ConfirmationURL` verifies at Supabase and returns a PKCE authorization code, whose verifier exists only in the browser that requested the email. `RedirectTo` is still supplied as the canonical recovery endpoint and must be allowed in URL Configuration, but the production template pins the visible link to GGMarket and sends `TokenHash` directly so Gmail or another browser can complete recovery.

The email-link GET never calls `verifyOtp`. It validates the token shape, stores it for ten minutes in an HttpOnly, SameSite=Strict, production-Secure cookie scoped to `/auth/recovery`, and redirects to a clean confirmation page. Only the user's explicit same-origin POST from **Continue to create new password** consumes the token. This prevents ordinary email security scanners and GET prefetchers from exhausting the one-time token. Keep Resend click tracking disabled.

## Vercel

Set these Production environment variables:

- `NEXT_PUBLIC_SITE_URL=https://ggmarket.eu` (Production scope only)
- `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<the project's public anon key>`
- `SUPABASE_URL=https://<project-ref>.supabase.co`
- `SUPABASE_SECRET_KEY=<server-only secret required by the authorized image-normalization endpoint>`
- `ADMIN_EMAILS=<existing comma-separated admin allowlist>`

`SUPABASE_SECRET_KEY` is not needed by email verification itself, but the application requires a privileged server key for authorized image normalization. The legacy `SUPABASE_SERVICE_ROLE_KEY` remains a supported fallback for manually configured projects. Never prefix either privileged key with `NEXT_PUBLIC_`, expose it to client code, or reuse it in Preview deployments. Leave `NEXT_PUBLIC_SITE_URL` unset in Preview: the application validates and uses Vercel's `VERCEL_URL` there. After changing an environment variable, create an authorized new deployment so the value is present in the server and browser build.

## Flow contract

Initial signup passes `https://ggmarket.eu/auth/callback?next=%2Fsettings%2Fverification&welcome=1` as `emailRedirectTo`; resend uses the same callback without the welcome marker. The production template links to the initial-signup callback with `token_hash`, `type=email`, the verification destination, and `welcome=1`. The callback calls Supabase `verifyOtp`, checks the returned authenticated user has `email_confirmed_at`, and only then redirects with `status=verified`. A consumed or failed link never receives the welcome state.

## Domain routing checks

- In Vercel Domains, mark `ggmarket.eu` as the primary production domain and configure `www.ggmarket.eu` to redirect to it.
- Keep the generated project hostname assigned to the project. The application performs an exact-host permanent redirect from `ggmarket-sage.vercel.app` to `ggmarket.eu` while leaving all other Vercel preview hostnames untouched.
- Verify `/auth/callback`, `/sitemap.xml`, and `/robots.txt` after the next authorized deployment. Do not test by changing production users or issuing real customer emails.

## Password recovery flow contract

Password recovery passes `https://ggmarket.eu/auth/recovery` as `redirectTo`. The reset template links to that endpoint with `token_hash` and `type=recovery`; the GET stages but does not verify the token. The confirmation POST accepts no other OTP type, calls `verifyOtp`, confirms the account is active, and persists the resulting recovery session in secure, SameSite=Lax SSR cookies. `/reset-password` and `/auth/update-password` both require a verified JWT `amr` entry whose method is `recovery`. The update route validates both fields, calls `updateUser({ password })`, signs out the local recovery session, and then shows confirmation. Expired, reused, malformed, and legacy PKCE failures remain in the recovery UI and never become Google OAuth errors.

Repository files cannot prove hosted Dashboard state. After installing the template, send a reset only to an isolated test account and inspect the received anchor before production rollout: it must start with `https://ggmarket.eu/auth/recovery?token_hash=` and include `type=recovery`; it must not use the Supabase `/auth/v1/verify` `ConfirmationURL`. Confirm that opening the link first shows **Continue password reset**, and that the password screen appears only after pressing the confirmation button. Never paste the received URL or token into logs or deployment notes.
