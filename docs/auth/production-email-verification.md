# Production email verification configuration

These values are required for the canonical GGMarket deployment. Dashboard changes are manual and must not be inferred from repository state.

## Supabase Auth

- **Authentication → URL Configuration → Site URL:** `https://ggmarket-sage.vercel.app`
- **Authentication → URL Configuration → Redirect URLs:** add the exact production callback `https://ggmarket-sage.vercel.app/auth/callback`.
- Keep `http://localhost:3000/auth/callback` only for local development. Do not use localhost as the Site URL in the production Supabase project.
- **Authentication → Providers → Email:** enable email/password and require Confirm email.
- **Authentication → Email Templates → Confirm signup:** copy the complete HTML from `docs/auth/confirm-signup-email.html`. It creates a real anchor whose `token_hash` is verified by the server callback with `verifyOtp`.
- Disable link tracking in the SMTP/email provider. Link rewriting can break Supabase confirmation URLs.

The template intentionally uses `TokenHash` and the canonical callback directly. Do not replace it with plain `{{ .TokenHash }}` text. Do not point `ConfirmationURL` at an application callback: `ConfirmationURL` is a Supabase `/auth/v1/verify` URL and represents a different flow.

## Vercel

Set these Production environment variables:

- `NEXT_PUBLIC_SITE_URL=https://ggmarket-sage.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<the project's public anon key>`
- `ADMIN_EMAILS=<existing comma-separated admin allowlist>`

`SUPABASE_SERVICE_ROLE_KEY` is not used by application runtime and must not be added merely for email verification. After changing an environment variable, create an authorized new deployment so the value is present in the server and browser build.

## Flow contract

Signup and resend pass `https://ggmarket-sage.vercel.app/auth/callback?next=%2Fsettings%2Fverification` as `emailRedirectTo`. The production template links to the same callback with `token_hash`, `type=email`, and the verification destination. The callback calls Supabase `verifyOtp`, checks the returned authenticated user has `email_confirmed_at`, and only then redirects with `status=verified`.
