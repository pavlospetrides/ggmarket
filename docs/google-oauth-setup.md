# Google OAuth production setup

Application code uses Supabase Auth's Google provider and the existing SSR/PKCE callback at `/auth/callback`. No Google client secret belongs in Vercel or the browser bundle.

## Google Cloud

1. Create or select the production Google Cloud project and configure Google Auth Platform branding, support contact, authorized domain `lootriva.com`, and the intended production audience.
2. Create an OAuth 2.0 **Web application** client.
3. In Supabase Dashboard, open **Authentication → Providers → Google** and copy the displayed Supabase callback URL. Add that exact URL as the Google client's authorized redirect URI. It has the form `https://<project-ref>.supabase.co/auth/v1/callback`; do not substitute the Vercel or application callback.
4. Store the Google Client ID and Client Secret only in Supabase's Google provider settings. Publish the consent screen when production verification requirements are satisfied.

## Supabase

1. Enable **Authentication → Providers → Google**, then enter the Google Web client ID and secret.
2. Set **Authentication → URL Configuration → Site URL** to `https://lootriva.com`.
3. Add `https://lootriva.com/auth/callback` to Redirect URLs.
4. Add only intentional preview callbacks. Prefer an explicit preview hostname for review; if a Supabase wildcard is used, scope it to the Vercel preview hostname pattern and remove stale entries.
5. Keep automatic identity linking enabled. Supabase links a verified matching Google email to the existing user UUID; Lootriva must not merge users or move ownership records itself.

## Vercel

1. Keep `NEXT_PUBLIC_SUPABASE_URL` and the project's publishable/anon key configured separately for Preview and Production.
2. Keep `NEXT_PUBLIC_SITE_URL=https://lootriva.com` in Production. Preview builds use their trusted Vercel deployment origin when constructing the application callback.
3. Do not add the Google Client Secret, Supabase service-role key, or OAuth tokens to public environment variables.
4. Add each preview callback URL to Supabase before testing that preview. A Google provider callback and an application `/auth/callback` URL are distinct and both must be configured in their corresponding systems.

## Manual acceptance

Use an isolated account and verify new Google signup, existing verified-email linking, cancellation, logout, refresh, account switching, and return to a protected action. Confirm the user UUID and existing listings/favorites/conversations remain unchanged. Test a suspended synthetic account and confirm it is signed out with visible feedback. Never perform identity-linking experiments against valuable production accounts.
